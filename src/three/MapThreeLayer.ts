import * as maplibregl from 'maplibre-gl';
import * as THREE from 'three';
import { BaseStation, Incident, Vehicle } from '../types/game';
import {
  BaseModelRefs,
  createBaseMesh,
  createIncidentMesh,
  createVehicleMesh,
  IncidentModelRefs,
  VehicleModelRefs,
} from './models';

export interface ThreeOverlayState {
  bases: BaseStation[];
  vehicles: Vehicle[];
  incidents: Incident[];
  selectedIncidentId: string | null;
  selectedBaseId: string | null;
  selectedVehicleId: string | null;
}

// Reusable math objects (zero GC inside render loop)
const _mercPos = new THREE.Vector3();
const _mercScale = new THREE.Vector3();
const _quatFinal = new THREE.Quaternion();
const _quatHeading = new THREE.Quaternion();
const _quatUp = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
const _quatFlip = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
const _axisZ = new THREE.Vector3(0, 0, 1);
const _matWorld = new THREE.Matrix4();
const _matProj = new THREE.Matrix4();

export class MapThreeLayer implements maplibregl.CustomLayerInterface {
  public readonly id = 'emergency-3d-layer';
  public readonly type = 'custom' as const;
  public readonly renderingMode = '3d' as const;

  private map: maplibregl.Map | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene = new THREE.Scene();
  private camera: THREE.Camera = new THREE.Camera();

  private vehicleMeshes = new Map<string, VehicleModelRefs>();
  private baseMeshes = new Map<string, BaseModelRefs>();
  private incidentMeshes = new Map<string, IncidentModelRefs>();

  private stateRef: { current: ThreeOverlayState };
  private startTime = performance.now();

  constructor(stateRef: { current: ThreeOverlayState }) {
    this.stateRef = stateRef;
    this.setupLighting();
  }

  private setupLighting(): void {
    // Cool sky / dark asphalt hemisphere bounce
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x0f172a, 1.55);
    this.scene.add(hemiLight);

    // Warm key sun light in Mercator space (-Y North, +Y South, +Z Up)
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    keyLight.position.set(0.45, 0.55, 1.1);
    this.scene.add(keyLight);

    // Cool rim backlight for silhouette separation
    const rimLight = new THREE.DirectionalLight(0x60a5fa, 0.95);
    rimLight.position.set(-0.6, -0.5, 0.7);
    this.scene.add(rimLight);
  }

  public onAdd(map: maplibregl.Map, gl: WebGL2RenderingContext): void {
    this.map = map;
    this.renderer = new THREE.WebGLRenderer({
      canvas: map.getCanvas(),
      context: gl,
      antialias: true,
    });
    this.renderer.autoClear = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
  }

  public onRemove(): void {
    this.vehicleMeshes.forEach((refs) => {
      this.scene.remove(refs.group);
    });
    this.vehicleMeshes.clear();

    this.baseMeshes.forEach((refs) => {
      this.scene.remove(refs.group);
    });
    this.baseMeshes.clear();

    this.incidentMeshes.forEach((refs) => {
      this.scene.remove(refs.group);
    });
    this.incidentMeshes.clear();

    this.renderer?.dispose();
    this.renderer = null;
    this.map = null;
  }

  private syncEntities(nowSec: number, zoom: number): void {
    const { bases, vehicles, incidents, selectedIncidentId, selectedBaseId, selectedVehicleId } =
      this.stateRef.current;

    // Scale multiplier keeps 3D units crisp and readable from city overview (z=12.5) down to street level (z=17)
    const zoomScaleFactor = THREE.MathUtils.clamp(Math.pow(2, 15.2 - zoom) * 2.2, 1.4, 14.0);

    // 1. Sync Bases
    const activeBaseIds = new Set<string>();
    for (const base of bases) {
      activeBaseIds.add(base.id);
      let refs = this.baseMeshes.get(base.id);
      if (!refs) {
        refs = createBaseMesh(base.type);
        this.baseMeshes.set(base.id, refs);
        this.scene.add(refs.group);
      }

      const merc = maplibregl.MercatorCoordinate.fromLngLat([base.position.lng, base.position.lat], 0);
      const unitScale = merc.meterInMercatorCoordinateUnits() * zoomScaleFactor * 0.72;

      _mercPos.set(merc.x, merc.y, merc.z || 0);
      _mercScale.set(unitScale, -unitScale, unitScale);
      _quatFinal.copy(_quatUp).multiply(_quatFlip);

      refs.group.matrixAutoUpdate = false;
      refs.group.matrix.compose(_mercPos, _quatFinal, _mercScale);

      const isSelected = base.id === selectedBaseId;
      refs.beaconMat.emissiveIntensity = isSelected ? 2.6 : 1.1 + Math.sin(nowSec * 3.0) * 0.4;
      refs.ringMesh.scale.setScalar(isSelected ? 1.25 + Math.sin(nowSec * 4) * 0.06 : 1.0);
    }
    for (const [id, refs] of this.baseMeshes.entries()) {
      if (!activeBaseIds.has(id)) {
        this.scene.remove(refs.group);
        this.baseMeshes.delete(id);
      }
    }

    // 2. Sync Incidents
    const activeIncidentIds = new Set<string>();
    for (const inc of incidents) {
      activeIncidentIds.add(inc.id);
      let refs = this.incidentMeshes.get(inc.id);
      if (!refs) {
        refs = createIncidentMesh(inc.severity);
        this.incidentMeshes.set(inc.id, refs);
        this.scene.add(refs.group);
      }

      const merc = maplibregl.MercatorCoordinate.fromLngLat([inc.position.lng, inc.position.lat], 0);
      const unitScale = merc.meterInMercatorCoordinateUnits() * zoomScaleFactor * 0.85;

      _mercPos.set(merc.x, merc.y, merc.z || 0);
      _mercScale.set(unitScale, -unitScale, unitScale);
      _quatFinal.copy(_quatUp).multiply(_quatFlip);

      refs.group.matrixAutoUpdate = false;
      refs.group.matrix.compose(_mercPos, _quatFinal, _mercScale);

      const isSelected = inc.id === selectedIncidentId;
      refs.diamond.rotation.y = nowSec * 2.2;
      refs.diamond.position.y = 10.5 + Math.sin(nowSec * 3.5) * 1.6;
      const ringPulse = isSelected ? 1.35 + Math.sin(nowSec * 6) * 0.12 : 1.0 + Math.sin(nowSec * 3) * 0.08;
      refs.ring.scale.setScalar(ringPulse);
      refs.coreMat.emissiveIntensity = isSelected ? 2.8 : 1.4 + Math.sin(nowSec * 5) * 0.5;
    }
    for (const [id, refs] of this.incidentMeshes.entries()) {
      if (!activeIncidentIds.has(id)) {
        this.scene.remove(refs.group);
        this.incidentMeshes.delete(id);
      }
    }

    // 3. Sync Vehicles
    const activeVehicleIds = new Set<string>();
    const flashToggle = Math.floor(nowSec * 8) % 2 === 0;

    for (const veh of vehicles) {
      activeVehicleIds.add(veh.id);
      let refs = this.vehicleMeshes.get(veh.id);
      if (!refs) {
        refs = createVehicleMesh(veh.type);
        this.vehicleMeshes.set(veh.id, refs);
        this.scene.add(refs.group);
      }

      const altitudeMeters = veh.type === 'rescue_heli' ? veh.altitude * zoomScaleFactor * 0.55 : 0;
      const merc = maplibregl.MercatorCoordinate.fromLngLat(
        [veh.position.lng, veh.position.lat],
        altitudeMeters
      );

      const isSelected = veh.id === selectedVehicleId;
      const selectedBoost = isSelected ? 1.28 : 1.0;
      const unitScale = merc.meterInMercatorCoordinateUnits() * zoomScaleFactor * 1.15 * selectedBoost;

      // Compose matrix: T * Scale(s, -s, s) * Rz(-bearing) * Rx(+PI/2) * Ry(PI)
      const bearingRad = (veh.bearing * Math.PI) / 180;
      _quatHeading.setFromAxisAngle(_axisZ, -bearingRad);
      _quatFinal.copy(_quatHeading).multiply(_quatUp).multiply(_quatFlip);

      _mercPos.set(merc.x, merc.y, merc.z || 0);
      _mercScale.set(unitScale, -unitScale, unitScale);

      refs.group.matrixAutoUpdate = false;
      refs.group.matrix.compose(_mercPos, _quatFinal, _mercScale);

      // Animate sirens/lightbars when active
      const lightsActive = veh.status === 'en_route' || veh.status === 'on_scene';
      if (refs.leftLightMat && refs.rightLightMat) {
        if (lightsActive) {
          refs.leftLightMat.emissiveIntensity = flashToggle ? 3.2 : 0.2;
          refs.rightLightMat.emissiveIntensity = flashToggle ? 0.2 : 3.2;
        } else {
          refs.leftLightMat.emissiveIntensity = 0.25;
          refs.rightLightMat.emissiveIntensity = 0.25;
        }
      }
      if (refs.headlightMat) {
        refs.headlightMat.emissiveIntensity = veh.status === 'idle' ? 0.2 : 1.4;
      }

      // Spin helicopter rotors
      if (refs.mainRotor) {
        const rotorSpeed = veh.status === 'idle' ? 1.5 : 22.0;
        refs.mainRotor.rotation.y = (nowSec * rotorSpeed) % (Math.PI * 2);
      }
      if (refs.tailRotor) {
        const tailSpeed = veh.status === 'idle' ? 2.0 : 28.0;
        refs.tailRotor.rotation.x = (nowSec * tailSpeed) % (Math.PI * 2);
      }
    }
    for (const [id, refs] of this.vehicleMeshes.entries()) {
      if (!activeVehicleIds.has(id)) {
        this.scene.remove(refs.group);
        this.vehicleMeshes.delete(id);
      }
    }
  }

  public render(_gl: WebGL2RenderingContext, options: maplibregl.CustomRenderMethodInput): void {
    if (!this.renderer || !this.map) return;

    const nowSec = (performance.now() - this.startTime) / 1000;
    const zoom = this.map.getZoom();

    this.syncEntities(nowSec, zoom);

    _matProj.fromArray(options.defaultProjectionData.mainMatrix as unknown as number[]);
    this.camera.projectionMatrix.copy(_matProj);
    this.camera.matrixWorldInverse.copy(_matWorld.identity());

    this.renderer.resetState();
    this.renderer.render(this.scene, this.camera);

    this.map.triggerRepaint();
  }
}
