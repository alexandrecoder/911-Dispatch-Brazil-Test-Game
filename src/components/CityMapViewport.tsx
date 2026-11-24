import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

maplibregl.setWorkerUrl(maplibreWorkerUrl);
import {
  BASE_CONFIGS,
  BaseStation,
  BaseType,
  CityPreset,
  Incident,
  LngLatPoint,
  MapVisualStyle,
  Vehicle,
  VEHICLE_CONFIGS,
} from '../types/game';
import { MapThreeLayer, ThreeOverlayState } from '../three/MapThreeLayer';

interface CityMapViewportProps {
  city: CityPreset;
  mapStyle: MapVisualStyle;
  bases: BaseStation[];
  vehicles: Vehicle[];
  incidents: Incident[];
  buildModeType: BaseType | null;
  selectedIncidentId: string | null;
  selectedBaseId: string | null;
  selectedVehicleId: string | null;
  followVehicleId: string | null;
  cameraCommand: { type: 'reset' | 'pitch_toggle' | 'focus'; point?: LngLatPoint; nonce: number } | null;
  onPlaceBase: (point: LngLatPoint, type: BaseType) => void;
  onSelectIncident: (id: string | null) => void;
  onSelectBase: (id: string | null) => void;
  onSelectVehicle: (id: string | null) => void;
  onCancelFollow: () => void;
}

interface PolygonFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: {
    type: 'Polygon';
    coordinates: Array<Array<[number, number]>>;
  };
}

interface LineStringFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: {
    type: 'LineString';
    coordinates: Array<[number, number]>;
  };
}

interface PointFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

function createCirclePolygon(center: LngLatPoint, radiusKm: number, steps = 48): PolygonFeature {
  const coords: Array<[number, number]> = [];
  const latRad = (center.lat * Math.PI) / 180;
  const kmPerDegLat = 111.32;
  const kmPerDegLng = 111.32 * Math.cos(latRad);

  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const dx = (Math.cos(angle) * radiusKm) / kmPerDegLng;
    const dy = (Math.sin(angle) * radiusKm) / kmPerDegLat;
    coords.push([center.lng + dx, center.lat + dy]);
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
  };
}

const OPENFREEMAP_DARK_STYLE = 'https://tiles.openfreemap.org/styles/dark';
const OPENFREEMAP_LIBERTY_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

function buildOfflineFallbackStyle(): maplibregl.StyleSpecification {
  return {
    version: 8,
    name: 'CentrOps Offline Grid',
    sources: {},
    layers: [
      {
        id: 'bg-fallback',
        type: 'background',
        paint: {
          'background-color': '#0b0f14',
        },
      },
    ],
  };
}

export const CityMapViewport: React.FC<CityMapViewportProps> = ({
  city,
  mapStyle,
  bases,
  vehicles,
  incidents,
  buildModeType,
  selectedIncidentId,
  selectedBaseId,
  selectedVehicleId,
  followVehicleId,
  cameraCommand,
  onPlaceBase,
  onSelectIncident,
  onSelectBase,
  onSelectVehicle,
  onCancelFollow,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const threeLayerRef = useRef<MapThreeLayer | null>(null);
  const [webglError, setWebglError] = useState(false);
  const [hoverPoint, setHoverPoint] = useState<LngLatPoint | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const lastAppliedStyleRef = useRef<MapVisualStyle>('tactical_dark');

  const overlayStateRef = useRef<ThreeOverlayState>({
    bases,
    vehicles,
    incidents,
    selectedIncidentId,
    selectedBaseId,
    selectedVehicleId,
  });

  overlayStateRef.current = {
    bases,
    vehicles,
    incidents,
    selectedIncidentId,
    selectedBaseId,
    selectedVehicleId,
  };

  // Refs for latest callbacks inside map event listeners
  const buildModeRef = useRef<BaseType | null>(buildModeType);
  buildModeRef.current = buildModeType;

  const callbacksRef = useRef({
    onPlaceBase,
    onSelectIncident,
    onSelectBase,
    onSelectVehicle,
    onCancelFollow,
  });
  callbacksRef.current = {
    onPlaceBase,
    onSelectIncident,
    onSelectBase,
    onSelectVehicle,
    onCancelFollow,
  };

  const ensureOverlayLayers = (map: maplibregl.Map) => {
    if (!map.getSource('coverage-source')) {
      map.addSource('coverage-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }
    if (!map.getLayer('coverage-fill')) {
      map.addLayer({
        id: 'coverage-fill',
        type: 'fill',
        source: 'coverage-source',
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': ['get', 'fillOpacity'],
        },
      });
    }
    if (!map.getLayer('coverage-outline')) {
      map.addLayer({
        id: 'coverage-outline',
        type: 'line',
        source: 'coverage-source',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 1.6,
          'line-dasharray': [3, 2],
          'line-opacity': 0.75,
        },
      });
    }

    if (!map.getSource('routes-source')) {
      map.addSource('routes-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }
    if (!map.getLayer('routes-glow')) {
      map.addLayer({
        id: 'routes-glow',
        type: 'line',
        source: 'routes-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 7,
          'line-opacity': 0.24,
        },
      });
    }
    if (!map.getLayer('routes-core')) {
      map.addLayer({
        id: 'routes-core',
        type: 'line',
        source: 'routes-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2.8,
          'line-opacity': 0.92,
        },
      });
    }

    if (!map.getSource('hitpoints-source')) {
      map.addSource('hitpoints-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }
    if (!map.getLayer('hitpoints-circle')) {
      map.addLayer({
        id: 'hitpoints-circle',
        type: 'circle',
        source: 'hitpoints-source',
        paint: {
          'circle-radius': ['get', 'radius'],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.01, // Invisible tactile hitbox over 3D models
          'circle-stroke-width': ['get', 'strokeWidth'],
          'circle-stroke-color': ['get', 'color'],
          'circle-stroke-opacity': ['get', 'strokeOpacity'],
        },
      });
    }

    // Add subtle dark 3D building extrusions on OpenFreeMap vector tiles in tactical dark mode
    if (map.getSource('openmaptiles') && !map.getLayer('building-3d') && !map.getLayer('tactical-3d-buildings')) {
      map.addLayer(
        {
          id: 'tactical-3d-buildings',
          type: 'fill-extrusion',
          source: 'openmaptiles',
          'source-layer': 'building',
          minzoom: 13.5,
          filter: ['!=', ['get', 'hide_3d'], true],
          paint: {
            'fill-extrusion-color': '#182232',
            'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 12],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
            'fill-extrusion-opacity': 0.72,
          },
        },
        'coverage-fill'
      );
    }

    if (!threeLayerRef.current) {
      threeLayerRef.current = new MapThreeLayer(overlayStateRef);
    }
    if (!map.getLayer('emergency-3d-layer')) {
      map.addLayer(threeLayerRef.current);
    }
  };

  // Initialize MapLibre once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container,
        style: OPENFREEMAP_DARK_STYLE,
        center: [city.center.lng, city.center.lat],
        zoom: city.zoom,
        pitch: city.pitch,
        bearing: city.bearing,
        maxPitch: 70,
        minZoom: 10.5,
        maxZoom: 18.2,
      });
    } catch {
      setWebglError(true);
      return;
    }

    mapRef.current = map;

    map.on('style.load', () => {
      ensureOverlayLayers(map);
      setMapReady(true);
    });

    map.on('error', (e: { error?: { message?: string } }) => {
      if (e?.error?.message && e.error.message.includes('style')) {
        map.setStyle(buildOfflineFallbackStyle());
      }
    });

    map.on('mousemove', (e: maplibregl.MapMouseEvent) => {
      if (buildModeRef.current) {
        setHoverPoint({ lng: e.lngLat.lng, lat: e.lngLat.lat });
      }
    });

    map.on('dragstart', () => {
      callbacksRef.current.onCancelFollow();
    });

    map.on('click', (e: maplibregl.MapMouseEvent) => {
      if (buildModeRef.current) {
        callbacksRef.current.onPlaceBase(
          { lng: e.lngLat.lng, lat: e.lngLat.lat },
          buildModeRef.current
        );
        return;
      }

      const features = map.queryRenderedFeatures(e.point, { layers: ['hitpoints-circle'] });
      if (features.length > 0) {
        // Prioritize incident -> vehicle -> base
        const inc = features.find((f: maplibregl.MapGeoJSONFeature) => f.properties?.kind === 'incident');
        if (inc?.properties?.entityId) {
          callbacksRef.current.onSelectIncident(String(inc.properties.entityId));
          return;
        }
        const veh = features.find((f: maplibregl.MapGeoJSONFeature) => f.properties?.kind === 'vehicle');
        if (veh?.properties?.entityId) {
          callbacksRef.current.onSelectVehicle(String(veh.properties.entityId));
          return;
        }
        const base = features.find((f: maplibregl.MapGeoJSONFeature) => f.properties?.kind === 'base');
        if (base?.properties?.entityId) {
          callbacksRef.current.onSelectBase(String(base.properties.entityId));
          return;
        }
      }

      callbacksRef.current.onSelectIncident(null);
      callbacksRef.current.onSelectBase(null);
      callbacksRef.current.onSelectVehicle(null);
    });

    map.on('mouseenter', 'hitpoints-circle', () => {
      if (!buildModeRef.current) {
        map.getCanvas().style.cursor = 'pointer';
      }
    });
    map.on('mouseleave', 'hitpoints-circle', () => {
      map.getCanvas().style.cursor = buildModeRef.current ? 'crosshair' : '';
    });

    const canvas = map.getCanvas();
    const onLost = (ev: Event) => {
      ev.preventDefault();
      setWebglError(true);
    };
    const onRestored = () => {
      setWebglError(false);
    };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);

    return () => {
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      map.remove();
      mapRef.current = null;
      threeLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update cursor when build mode changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = buildModeType ? 'crosshair' : '';
    if (!buildModeType) {
      setHoverPoint(null);
    }
  }, [buildModeType]);

  // Switch city smoothly
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: [city.center.lng, city.center.lat],
      zoom: city.zoom,
      pitch: city.pitch,
      bearing: city.bearing,
      duration: 1200,
    });
  }, [city]);

  // Switch map style (Tactical Dark vs 3D Buildings Liberty)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || lastAppliedStyleRef.current === mapStyle) return;
    lastAppliedStyleRef.current = mapStyle;

    if (mapStyle === 'urban_3d') {
      map.setStyle(OPENFREEMAP_LIBERTY_STYLE);
    } else {
      map.setStyle(OPENFREEMAP_DARK_STYLE);
    }
  }, [mapStyle, mapReady]);

  // Handle explicit camera commands
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !cameraCommand) return;
    if (cameraCommand.type === 'reset') {
      map.easeTo({
        center: [city.center.lng, city.center.lat],
        zoom: city.zoom,
        pitch: city.pitch,
        bearing: city.bearing,
        duration: 850,
      });
    } else if (cameraCommand.type === 'pitch_toggle') {
      const nextPitch = map.getPitch() > 25 ? 0 : 56;
      map.easeTo({ pitch: nextPitch, duration: 600 });
    } else if (cameraCommand.type === 'focus' && cameraCommand.point) {
      map.easeTo({
        center: [cameraCommand.point.lng, cameraCommand.point.lat],
        zoom: Math.max(map.getZoom(), 15.2),
        duration: 750,
      });
    }
  }, [cameraCommand, city]);

  // Follow selected vehicle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !followVehicleId) return;
    const veh = vehicles.find((v) => v.id === followVehicleId);
    if (!veh) return;
    map.setCenter([veh.position.lng, veh.position.lat]);
  }, [followVehicleId, vehicles]);

  // Sync GeoJSON overlays (routes, coverage circles, hitpoints)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const routesSource = map.getSource('routes-source') as maplibregl.GeoJSONSource | undefined;
    if (routesSource) {
      const routeFeatures: LineStringFeature[] = [];
      for (const veh of vehicles) {
        if ((veh.status === 'en_route' || veh.status === 'returning') && veh.route.length >= 2) {
          const remainingPts = [veh.position, ...veh.route.slice(veh.routeIndex + 1)];
          if (remainingPts.length >= 2) {
            routeFeatures.push({
              type: 'Feature',
              properties: {
                color: VEHICLE_CONFIGS[veh.type].color,
              },
              geometry: {
                type: 'LineString',
                coordinates: remainingPts.map((p) => [p.lng, p.lat]),
              },
            });
          }
        }
      }
      routesSource.setData({ type: 'FeatureCollection', features: routeFeatures } as never);
    }

    const coverageSource = map.getSource('coverage-source') as maplibregl.GeoJSONSource | undefined;
    if (coverageSource) {
      const covFeatures: PolygonFeature[] = [];
      if (selectedBaseId) {
        const base = bases.find((b) => b.id === selectedBaseId);
        if (base) {
          const cfg = BASE_CONFIGS[base.type];
          const poly = createCirclePolygon(base.position, cfg.coverageKm * (1 + (base.level - 1) * 0.15));
          poly.properties = { color: cfg.color, fillOpacity: 0.1 };
          covFeatures.push(poly);
        }
      }
      if (buildModeType && hoverPoint) {
        const cfg = BASE_CONFIGS[buildModeType];
        const poly = createCirclePolygon(hoverPoint, cfg.coverageKm);
        poly.properties = { color: cfg.color, fillOpacity: 0.16 };
        covFeatures.push(poly);
      }
      coverageSource.setData({ type: 'FeatureCollection', features: covFeatures } as never);
    }

    const hitSource = map.getSource('hitpoints-source') as maplibregl.GeoJSONSource | undefined;
    if (hitSource) {
      const hitFeatures: PointFeature[] = [];

      for (const base of bases) {
        const isSel = base.id === selectedBaseId;
        hitFeatures.push({
          type: 'Feature',
          properties: {
            kind: 'base',
            entityId: base.id,
            color: BASE_CONFIGS[base.type].color,
            radius: 20,
            strokeWidth: isSel ? 2.5 : 0,
            strokeOpacity: isSel ? 0.95 : 0,
          },
          geometry: { type: 'Point', coordinates: [base.position.lng, base.position.lat] },
        });
      }

      for (const inc of incidents) {
        const isSel = inc.id === selectedIncidentId;
        const incColor =
          inc.severity === 'critical' ? '#EF4444' : inc.severity === 'high' ? '#F59E0B' : '#38BDF8';
        hitFeatures.push({
          type: 'Feature',
          properties: {
            kind: 'incident',
            entityId: inc.id,
            color: incColor,
            radius: 22,
            strokeWidth: isSel ? 2.5 : 0,
            strokeOpacity: isSel ? 0.95 : 0,
          },
          geometry: { type: 'Point', coordinates: [inc.position.lng, inc.position.lat] },
        });
      }

      for (const veh of vehicles) {
        const isSel = veh.id === selectedVehicleId;
        hitFeatures.push({
          type: 'Feature',
          properties: {
            kind: 'vehicle',
            entityId: veh.id,
            color: VEHICLE_CONFIGS[veh.type].color,
            radius: 16,
            strokeWidth: isSel ? 2 : 0,
            strokeOpacity: isSel ? 0.95 : 0,
          },
          geometry: { type: 'Point', coordinates: [veh.position.lng, veh.position.lat] },
        });
      }

      hitSource.setData({ type: 'FeatureCollection', features: hitFeatures } as never);
    }
  }, [
    mapReady,
    bases,
    vehicles,
    incidents,
    selectedBaseId,
    selectedIncidentId,
    selectedVehicleId,
    buildModeType,
    hoverPoint,
  ]);

  if (webglError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0B0F14] text-slate-200 p-8">
        <div className="max-w-md border border-slate-800 bg-slate-900/90 rounded-xl p-6 text-center space-y-3">
          <h2 className="font-display text-xl font-bold text-amber-400">Contexto WebGL 3D Indisponível</h2>
          <p className="text-sm text-slate-400">
            Seu navegador ou ambiente atual suspendeu a aceleração WebGL necessária para o mapa 3D.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
          >
            Recarregar Simulação
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0B0F14]">
      <div ref={containerRef} className="w-full h-full" />

      {/* Build Mode Cursor Instruction Banner */}
      {buildModeType && (
        <div className="pointer-events-none fixed top-20 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-lg bg-[#0F1622]/95 border border-amber-500/50 shadow-xl text-xs font-medium text-amber-100 flex items-center gap-3">
          <span>
            Clique no mapa de <strong className="text-white">{city.name}</strong> para construir:{' '}
            <strong style={{ color: BASE_CONFIGS[buildModeType].color }}>
              {BASE_CONFIGS[buildModeType].label}
            </strong>{' '}
            (R$ {BASE_CONFIGS[buildModeType].cost.toLocaleString('pt-BR')})
          </span>
        </div>
      )}
    </div>
  );
};
