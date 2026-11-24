import { useCallback, useEffect, useRef, useState } from 'react';
import { BottomControlDock } from './components/BottomControlDock';
import { CityMapViewport } from './components/CityMapViewport';
import { CitySelectorModal } from './components/CitySelectorModal';
import { IncidentSidebar } from './components/IncidentSidebar';
import { InspectorPanel } from './components/InspectorPanel';
import { TopCommandBar } from './components/TopCommandBar';
import { CITY_PRESETS, INCIDENT_TEMPLATES } from './data/cities';
import {
  calculateRouteDistanceKm,
  computeBearingDeg,
  fetchStreetRoute,
  haversineKm,
  offsetLngLat,
  snapPointToStreet,
} from './services/routing';
import { soundEngine } from './services/sound';
import {
  BASE_CONFIGS,
  BaseStation,
  BaseType,
  CityPreset,
  DispatchFeedEntry,
  Incident,
  LngLatPoint,
  MapVisualStyle,
  Vehicle,
  VEHICLE_CONFIGS,
} from './types/game';

const SIM_PACE_MULTIPLIER = 3.2;

let idCounter = 1;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

function createInitialCityState(city: CityPreset): {
  bases: BaseStation[];
  vehicles: Vehicle[];
} {
  const policePos = offsetLngLat(city.center, -680, 320);
  const samuPos = offsetLngLat(city.center, 740, -280);

  const policeBase: BaseStation = {
    id: nextId('base'),
    name: `1ª DP — ${city.districts[0] || city.name}`,
    type: 'police',
    position: policePos,
    level: 1,
    capacity: BASE_CONFIGS.police.initialCapacity,
    dispatchBoost: 1,
    createdAt: Date.now(),
  };

  const samuBase: BaseStation = {
    id: nextId('base'),
    name: `Base SAMU — ${city.districts[1] || 'Central'}`,
    type: 'medical',
    position: samuPos,
    level: 1,
    capacity: BASE_CONFIGS.medical.initialCapacity,
    dispatchBoost: 1,
    createdAt: Date.now(),
  };

  const vehicles: Vehicle[] = [
    {
      id: nextId('veh'),
      callsign: 'VTR-1901',
      type: 'police_suv',
      service: 'police',
      baseId: policeBase.id,
      status: 'idle',
      position: { ...policePos },
      bearing: 0,
      altitude: 0,
      speedKmh: VEHICLE_CONFIGS.police_suv.speedKmh,
      assignedIncidentId: null,
      route: [],
      routeIndex: 0,
      segmentProgress: 0,
      distanceRemainingKm: 0,
      etaSeconds: 0,
    },
    {
      id: nextId('veh'),
      callsign: 'VTR-1902',
      type: 'police_suv',
      service: 'police',
      baseId: policeBase.id,
      status: 'idle',
      position: offsetLngLat(policePos, 24, -18),
      bearing: 90,
      altitude: 0,
      speedKmh: VEHICLE_CONFIGS.police_suv.speedKmh,
      assignedIncidentId: null,
      route: [],
      routeIndex: 0,
      segmentProgress: 0,
      distanceRemainingKm: 0,
      etaSeconds: 0,
    },
    {
      id: nextId('veh'),
      callsign: 'UTI-1921',
      type: 'ambulance',
      service: 'medical',
      baseId: samuBase.id,
      status: 'idle',
      position: { ...samuPos },
      bearing: 180,
      altitude: 0,
      speedKmh: VEHICLE_CONFIGS.ambulance.speedKmh,
      assignedIncidentId: null,
      route: [],
      routeIndex: 0,
      segmentProgress: 0,
      distanceRemainingKm: 0,
      etaSeconds: 0,
    },
    {
      id: nextId('veh'),
      callsign: 'UTI-1922',
      type: 'ambulance',
      service: 'medical',
      baseId: samuBase.id,
      status: 'idle',
      position: offsetLngLat(samuPos, -24, 18),
      bearing: 270,
      altitude: 0,
      speedKmh: VEHICLE_CONFIGS.ambulance.speedKmh,
      assignedIncidentId: null,
      route: [],
      routeIndex: 0,
      segmentProgress: 0,
      distanceRemainingKm: 0,
      etaSeconds: 0,
    },
  ];

  return {
    bases: [policeBase, samuBase],
    vehicles,
  };
}

function areRequirementsMet(incident: Incident, arrivedVehicles: Vehicle[]): boolean {
  let police = arrivedVehicles.filter((v) => v.service === 'police').length;
  let fire = arrivedVehicles.filter((v) => v.service === 'fire').length;
  let medical = arrivedVehicles.filter((v) => v.service === 'medical').length;
  let air = arrivedVehicles.filter((v) => v.service === 'air').length;

  // Air rescue helicopters can fill any single unmet specialist slot
  while (air > 0) {
    if (police < incident.required.police) {
      police += 1;
      air -= 1;
    } else if (medical < incident.required.medical) {
      medical += 1;
      air -= 1;
    } else if (fire < incident.required.fire) {
      fire += 1;
      air -= 1;
    } else {
      break;
    }
  }

  return (
    police >= incident.required.police &&
    fire >= incident.required.fire &&
    medical >= incident.required.medical
  );
}

export default function App() {
  const [city, setCity] = useState<CityPreset>(CITY_PRESETS[0]);
  const [mapStyle, setMapStyle] = useState<MapVisualStyle>('tactical_dark');
  const [cityModalOpen, setCityModalOpen] = useState(false);

  const initialSetup = useRef(createInitialCityState(CITY_PRESETS[0]));
  const [bases, setBases] = useState<BaseStation[]>(initialSetup.current.bases);
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialSetup.current.vehicles);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  const [budget, setBudget] = useState<number>(110000);
  const [reputation, setReputation] = useState<number>(88);
  const [resolvedCount, setResolvedCount] = useState<number>(0);
  const [expiredCount, setExpiredCount] = useState<number>(0);
  const [simSpeed, setSimSpeed] = useState<0 | 1 | 2 | 4>(1);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const [buildModeType, setBuildModeType] = useState<BaseType | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [followVehicleId, setFollowVehicleId] = useState<string | null>(null);
  const [cameraCommand, setCameraCommand] = useState<{
    type: 'reset' | 'pitch_toggle' | 'focus';
    point?: LngLatPoint;
    nonce: number;
  } | null>(null);

  const [feedToast, setFeedToast] = useState<DispatchFeedEntry | null>(null);
  const [gameOver, setGameOver] = useState<boolean>(false);

  // Refs for synchronous access in simulation loop & async callbacks
  const basesRef = useRef(bases);
  basesRef.current = bases;
  const vehiclesRef = useRef(vehicles);
  vehiclesRef.current = vehicles;
  const incidentsRef = useRef(incidents);
  incidentsRef.current = incidents;
  const cityRef = useRef(city);
  cityRef.current = city;
  const simSpeedRef = useRef(simSpeed);
  simSpeedRef.current = simSpeed;
  const gameOverRef = useRef(gameOver);
  gameOverRef.current = gameOver;

  const pushNotice = useCallback((message: string, tone: DispatchFeedEntry['tone'] = 'info') => {
    const now = new Date();
    const timestamp = now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setFeedToast({ id: nextId('log'), timestamp, message, tone });
  }, []);

  // Auto-hide feed toast after 4.5s
  useEffect(() => {
    if (!feedToast) return;
    const t = window.setTimeout(() => setFeedToast(null), 4500);
    return () => window.clearTimeout(t);
  }, [feedToast]);

  // Spawn an urban incident snapped to real streets
  const spawnIncident = useCallback(async () => {
    if (gameOverRef.current) return;
    const currentCity = cityRef.current;
    const currentIncidents = incidentsRef.current;
    const currentBases = basesRef.current;

    if (currentIncidents.length >= 6) return;

    const hasFireBase = currentBases.some((b) => b.type === 'fire' || b.type === 'heliport');
    const pool = hasFireBase
      ? INCIDENT_TEMPLATES
      : INCIDENT_TEMPLATES.filter((t) => t.required.fire === 0 || Math.random() < 0.28);

    const template = pool[Math.floor(Math.random() * pool.length)];
    const angle = Math.random() * Math.PI * 2;
    const distMeters = (0.45 + Math.random() * (currentCity.radiusKm - 0.6)) * 1000;
    const candidate = offsetLngLat(
      currentCity.center,
      Math.cos(angle) * distMeters,
      Math.sin(angle) * distMeters
    );

    const snapped = await snapPointToStreet(candidate);
    if (gameOverRef.current || cityRef.current.id !== currentCity.id) return;

    const district =
      currentCity.districts[Math.floor(Math.random() * currentCity.districts.length)] ||
      currentCity.name;

    const newInc: Incident = {
      id: nextId('inc'),
      code: template.code,
      title: template.title,
      description: template.description,
      district,
      severity: template.severity,
      position: snapped,
      required: { ...template.required },
      assignedVehicleIds: [],
      arrivedVehicleIds: [],
      timeLimitSec: template.timeLimitSec,
      remainingSec: template.timeLimitSec,
      resolveDurationSec: template.resolveDurationSec,
      resolveProgressSec: 0,
      reward: template.reward,
      reputationPenalty: template.reputationPenalty,
      createdAt: Date.now(),
    };

    setIncidents((prev) => [newInc, ...prev]);
    soundEngine.playNewIncident(template.severity === 'critical');
    pushNotice(`Novo chamado (${template.code}): ${template.title} em ${district}.`, 'warning');
  }, [pushNotice]);

  // Spawn first incident shortly after start
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (incidentsRef.current.length === 0) {
        void spawnIncident();
      }
    }, 1500);
    return () => window.clearTimeout(t);
  }, [city.id, spawnIncident]);

  // Periodic incident spawner
  useEffect(() => {
    let acc = 0;
    const interval = window.setInterval(() => {
      if (simSpeedRef.current === 0 || gameOverRef.current) return;
      acc += simSpeedRef.current;
      const threshold = Math.max(9, 17 - Math.floor(basesRef.current.length * 1.1));
      if (acc >= threshold) {
        acc = 0;
        void spawnIncident();
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [spawnIncident]);

  // Dispatch a specific vehicle to an incident
  const dispatchVehicle = useCallback(
    async (vehicleId: string, incidentId: string) => {
      const veh = vehiclesRef.current.find((v) => v.id === vehicleId);
      const inc = incidentsRef.current.find((i) => i.id === incidentId);
      if (!veh || !inc) return;

      const cfg = VEHICLE_CONFIGS[veh.type];
      const homeBase = basesRef.current.find((b) => b.id === veh.baseId);
      const speedMult = homeBase ? homeBase.dispatchBoost : 1;
      const effectiveSpeed = cfg.speedKmh * speedMult;

      soundEngine.playDispatch();

      // Immediately mark assigned & detach from previous incident if redirected
      setIncidents((prev) =>
        prev.map((item) => {
          if (item.id === incidentId) {
            const assigned = item.assignedVehicleIds.includes(vehicleId)
              ? item.assignedVehicleIds
              : [...item.assignedVehicleIds, vehicleId];
            return { ...item, assignedVehicleIds: assigned };
          }
          if (item.assignedVehicleIds.includes(vehicleId)) {
            return {
              ...item,
              assignedVehicleIds: item.assignedVehicleIds.filter((id) => id !== vehicleId),
              arrivedVehicleIds: item.arrivedVehicleIds.filter((id) => id !== vehicleId),
            };
          }
          return item;
        })
      );

      const { points, distanceKm } = await fetchStreetRoute(veh.position, inc.position, cfg.isAir);
      const etaSeconds = (distanceKm / ((effectiveSpeed / 3600) * SIM_PACE_MULTIPLIER));

      setVehicles((prev) =>
        prev.map((v) => {
          if (v.id !== vehicleId) return v;
          const nextBearing =
            points.length >= 2 ? computeBearingDeg(points[0], points[1]) : v.bearing;
          return {
            ...v,
            status: 'en_route',
            assignedIncidentId: incidentId,
            route: points,
            routeIndex: 0,
            segmentProgress: 0,
            speedKmh: effectiveSpeed,
            bearing: nextBearing,
            distanceRemainingKm: distanceKm,
            etaSeconds,
          };
        })
      );

      pushNotice(`${veh.callsign} despachada para ${inc.title}.`, 'info');
    },
    [pushNotice]
  );

  // Send a vehicle back to its home base along real streets
  const returnVehicleToBase = useCallback(async (vehicleId: string) => {
    const veh = vehiclesRef.current.find((v) => v.id === vehicleId);
    if (!veh) return;
    const base = basesRef.current.find((b) => b.id === veh.baseId);
    if (!base) return;

    const cfg = VEHICLE_CONFIGS[veh.type];

    setIncidents((prev) =>
      prev.map((item) => ({
        ...item,
        assignedVehicleIds: item.assignedVehicleIds.filter((id) => id !== vehicleId),
        arrivedVehicleIds: item.arrivedVehicleIds.filter((id) => id !== vehicleId),
      }))
    );

    const { points, distanceKm } = await fetchStreetRoute(veh.position, base.position, cfg.isAir);
    const etaSeconds = distanceKm / ((veh.speedKmh / 3600) * SIM_PACE_MULTIPLIER);

    setVehicles((prev) =>
      prev.map((v) => {
        if (v.id !== vehicleId) return v;
        const nextBearing =
          points.length >= 2 ? computeBearingDeg(points[0], points[1]) : v.bearing;
        return {
          ...v,
          status: 'returning',
          assignedIncidentId: null,
          route: points,
          routeIndex: 0,
          segmentProgress: 0,
          bearing: nextBearing,
          distanceRemainingKm: distanceKm,
          etaSeconds,
        };
      })
    );
  }, []);

  // Smart Auto-Dispatch closest available units matching incident requirements
  const handleAutoDispatch = useCallback(
    (incidentId: string) => {
      const inc = incidentsRef.current.find((i) => i.id === incidentId);
      if (!inc) return;

      const assigned = vehiclesRef.current.filter((v) => inc.assignedVehicleIds.includes(v.id));
      let needPolice = Math.max(
        0,
        inc.required.police - assigned.filter((v) => v.service === 'police').length
      );
      let needFire = Math.max(
        0,
        inc.required.fire - assigned.filter((v) => v.service === 'fire').length
      );
      let needMedical = Math.max(
        0,
        inc.required.medical - assigned.filter((v) => v.service === 'medical').length
      );

      // Account for any already assigned air rescue
      let airAssigned = assigned.filter((v) => v.service === 'air').length;
      while (airAssigned > 0) {
        if (needPolice > 0) needPolice--;
        else if (needMedical > 0) needMedical--;
        else if (needFire > 0) needFire--;
        else break;
        airAssigned--;
      }

      if (needPolice === 0 && needFire === 0 && needMedical === 0) {
        pushNotice('Todas as unidades necessárias já foram despachadas para este chamado.', 'info');
        return;
      }

      const candidates = vehiclesRef.current
        .filter((v) => (v.status === 'idle' || v.status === 'returning') && v.assignedIncidentId !== incidentId)
        .map((v) => ({
          v,
          dist: haversineKm(v.position, inc.position),
        }))
        .sort((a, b) => a.dist - b.dist);

      const chosenIds: string[] = [];

      const pickFor = (service: 'police' | 'fire' | 'medical', count: number) => {
        let remaining = count;
        for (const item of candidates) {
          if (remaining <= 0) break;
          if (item.v.service === service && !chosenIds.includes(item.v.id)) {
            chosenIds.push(item.v.id);
            remaining -= 1;
          }
        }
        return remaining;
      };

      needPolice = pickFor('police', needPolice);
      needFire = pickFor('fire', needFire);
      needMedical = pickFor('medical', needMedical);

      // Fill any still-unmet slot with available Rescue Helicopter
      let totalMissing = needPolice + needFire + needMedical;
      if (totalMissing > 0) {
        for (const item of candidates) {
          if (totalMissing <= 0) break;
          if (item.v.service === 'air' && !chosenIds.includes(item.v.id)) {
            chosenIds.push(item.v.id);
            totalMissing -= 1;
          }
        }
      }

      if (chosenIds.length === 0) {
        soundEngine.playError();
        pushNotice(
          'Nenhuma viatura compatível disponível! Construa a base necessária ou aguarde retorno.',
          'danger'
        );
        return;
      }

      chosenIds.forEach((vid) => {
        void dispatchVehicle(vid, incidentId);
      });
    },
    [dispatchVehicle, pushNotice]
  );

  // Main Continuous Simulation Loop
  useEffect(() => {
    let lastTime = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const rawDt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      const speed = simSpeedRef.current;
      if (speed > 0 && !gameOverRef.current) {
        const dt = rawDt * speed;

        const arrivedThisFrame: Array<{ vehicleId: string; incidentId: string }> = [];
        const resolvedIncidentIds: string[] = [];
        const expiredIncidentIds: string[] = [];

        // 1. Advance vehicles along routes synchronously from vehiclesRef
        const prevVehicles = vehiclesRef.current;
        const nextVehicles: Vehicle[] = prevVehicles.map((v) => {
          if (v.status !== 'en_route' && v.status !== 'returning') {
            if (v.type === 'rescue_heli') {
              const targetAlt = v.status === 'on_scene' ? 28 : 0;
              const nextAlt = v.altitude + (targetAlt - v.altitude) * Math.min(1, dt * 4);
              if (Math.abs(nextAlt - v.altitude) > 0.05) {
                return { ...v, altitude: nextAlt };
              }
            }
            return v;
          }

          if (v.route.length < 2 || v.routeIndex >= v.route.length - 1) {
            if (v.status === 'en_route' && v.assignedIncidentId) {
              arrivedThisFrame.push({ vehicleId: v.id, incidentId: v.assignedIncidentId });
              return {
                ...v,
                status: 'on_scene',
                distanceRemainingKm: 0,
                etaSeconds: 0,
              };
            }
            return {
              ...v,
              status: 'idle',
              altitude: 0,
              route: [],
              routeIndex: 0,
              segmentProgress: 0,
              distanceRemainingKm: 0,
              etaSeconds: 0,
            };
          }

          let stepKm = (v.speedKmh / 3600) * dt * SIM_PACE_MULTIPLIER;
          let idx = v.routeIndex;
          let segProg = v.segmentProgress;
          let currentPos = v.position;
          let bearing = v.bearing;

          while (stepKm > 0 && idx < v.route.length - 1) {
            const pA = v.route[idx];
            const pB = v.route[idx + 1];
            const segLenKm = Math.max(0.0005, haversineKm(pA, pB));
            const remainingSegKm = segLenKm * (1 - segProg);

            bearing = computeBearingDeg(pA, pB);

            if (stepKm >= remainingSegKm) {
              stepKm -= remainingSegKm;
              idx += 1;
              segProg = 0;
              currentPos = { ...pB };
            } else {
              segProg += stepKm / segLenKm;
              currentPos = {
                lng: pA.lng + (pB.lng - pA.lng) * segProg,
                lat: pA.lat + (pB.lat - pA.lat) * segProg,
              };
              stepKm = 0;
            }
          }

          let nextAlt = v.altitude;
          if (v.type === 'rescue_heli') {
            const targetAlt = idx >= v.route.length - 1 ? (v.status === 'en_route' ? 28 : 0) : 72;
            nextAlt = v.altitude + (targetAlt - v.altitude) * Math.min(1, dt * 3.5);
          }

          if (idx >= v.route.length - 1) {
            if (v.status === 'en_route' && v.assignedIncidentId) {
              arrivedThisFrame.push({ vehicleId: v.id, incidentId: v.assignedIncidentId });
              return {
                ...v,
                status: 'on_scene',
                position: currentPos,
                bearing,
                altitude: nextAlt,
                routeIndex: idx,
                segmentProgress: 0,
                distanceRemainingKm: 0,
                etaSeconds: 0,
              };
            }
            return {
              ...v,
              status: 'idle',
              position: currentPos,
              bearing,
              altitude: 0,
              route: [],
              routeIndex: 0,
              segmentProgress: 0,
              distanceRemainingKm: 0,
              etaSeconds: 0,
            };
          }

          const remSeg = haversineKm(currentPos, v.route[idx + 1]);
          const restDist = calculateRouteDistanceKm(v.route.slice(idx + 1));
          const totalRem = remSeg + restDist;
          const eta = totalRem / ((v.speedKmh / 3600) * SIM_PACE_MULTIPLIER);

          return {
            ...v,
            position: currentPos,
            bearing,
            altitude: nextAlt,
            routeIndex: idx,
            segmentProgress: segProg,
            distanceRemainingKm: totalRem,
            etaSeconds: eta,
          };
        });

        vehiclesRef.current = nextVehicles;
        setVehicles(nextVehicles);

        // 2. Advance incidents & resolution progress synchronously
        const prevIncidents = incidentsRef.current;
        const nextIncidents: Incident[] = [];

        for (const inc of prevIncidents) {
          const newlyArrived = arrivedThisFrame
            .filter((a) => a.incidentId === inc.id)
            .map((a) => a.vehicleId);

          const arrivedIds = Array.from(new Set([...inc.arrivedVehicleIds, ...newlyArrived]));
          const arrivedVehs = nextVehicles.filter((v) => arrivedIds.includes(v.id));

          const readyToResolve = areRequirementsMet(inc, arrivedVehs);
          const hasAirSupport = arrivedVehs.some((v) => v.service === 'air');
          const resolveRate = hasAirSupport ? 1.35 : 1.0;

          let nextProgress = inc.resolveProgressSec;
          let nextRemaining = inc.remainingSec;

          if (readyToResolve) {
            nextProgress += dt * resolveRate;
          } else {
            const decayMult = arrivedVehs.length > 0 ? 0.55 : 1.0;
            nextRemaining -= dt * decayMult;
          }

          if (nextProgress >= inc.resolveDurationSec) {
            resolvedIncidentIds.push(inc.id);
            continue;
          }

          if (nextRemaining <= 0) {
            expiredIncidentIds.push(inc.id);
            continue;
          }

          nextIncidents.push({
            ...inc,
            arrivedVehicleIds: arrivedIds,
            resolveProgressSec: nextProgress,
            remainingSec: nextRemaining,
          });
        }

        incidentsRef.current = nextIncidents;
        setIncidents(nextIncidents);

        // 3. Handle resolved & expired side effects using prevIncidents
        if (resolvedIncidentIds.length > 0) {
          let totalReward = 0;
          const vehsToReturn: string[] = [];

          for (const rid of resolvedIncidentIds) {
            const inc = prevIncidents.find((i) => i.id === rid);
            if (inc) {
              totalReward += inc.reward;
              vehsToReturn.push(...inc.assignedVehicleIds);
            }
          }

          if (totalReward > 0) {
            setBudget((b) => b + totalReward);
            setResolvedCount((c) => c + resolvedIncidentIds.length);
            setReputation((r) => Math.min(100, r + 3 * resolvedIncidentIds.length));
            soundEngine.playResolved();
            pushNotice(
              `Ocorrência resolvida! +R$ ${totalReward.toLocaleString('pt-BR')} adicionados ao orçamento.`,
              'success'
            );
          }

          vehsToReturn.forEach((vid) => {
            void returnVehicleToBase(vid);
          });
        }

        if (expiredIncidentIds.length > 0) {
          let totalPenalty = 0;
          const vehsToReturn: string[] = [];

          for (const eid of expiredIncidentIds) {
            const inc = prevIncidents.find((i) => i.id === eid);
            if (inc) {
              totalPenalty += inc.reputationPenalty;
              vehsToReturn.push(...inc.assignedVehicleIds);
            }
          }

          if (totalPenalty > 0) {
            setExpiredCount((c) => c + expiredIncidentIds.length);
            setReputation((r) => {
              const nextRep = Math.max(0, r - totalPenalty);
              if (nextRep <= 15) {
                setGameOver(true);
              }
              return nextRep;
            });
            soundEngine.playError();
            pushNotice(
              `Ocorrência sem atendimento a tempo! Reputação caiu ${totalPenalty}%.`,
              'danger'
            );
          }

          vehsToReturn.forEach((vid) => {
            void returnVehicleToBase(vid);
          });
        }
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [pushNotice, returnVehicleToBase]);

  // Build new base on map click
  const handlePlaceBase = useCallback(
    async (rawPoint: LngLatPoint, type: BaseType) => {
      const cfg = BASE_CONFIGS[type];
      if (budget < cfg.cost) {
        soundEngine.playError();
        pushNotice('Orçamento insuficiente para construir esta base.', 'danger');
        setBuildModeType(null);
        return;
      }

      const snapped = type === 'heliport' ? rawPoint : await snapPointToStreet(rawPoint);
      const baseIndex = basesRef.current.filter((b) => b.type === type).length + 1;
      const baseId = nextId('base');

      const newBase: BaseStation = {
        id: baseId,
        name: `${baseIndex}ª ${cfg.shortLabel} — ${cityRef.current.name}`,
        type,
        position: snapped,
        level: 1,
        capacity: cfg.initialCapacity,
        dispatchBoost: 1,
        createdAt: Date.now(),
      };

      const vehCfg = VEHICLE_CONFIGS[cfg.defaultVehicleType];
      const prefixMap: Record<BaseType, string> = {
        police: 'VTR',
        fire: 'ABT',
        medical: 'UTI',
        heliport: 'ÁGUIA',
      };

      const existingCount = vehiclesRef.current.filter(
        (v) => v.type === cfg.defaultVehicleType
      ).length;

      const spawnedVehicles: Vehicle[] = Array.from({ length: cfg.initialVehicles }).map(
        (_, i) => ({
          id: nextId('veh'),
          callsign: `${prefixMap[type]}-${100 + existingCount + i + 1}`,
          type: cfg.defaultVehicleType,
          service: vehCfg.service,
          baseId,
          status: 'idle',
          position: offsetLngLat(snapped, i * 22 - 11, i * 14 - 7),
          bearing: i * 90,
          altitude: 0,
          speedKmh: vehCfg.speedKmh,
          assignedIncidentId: null,
          route: [],
          routeIndex: 0,
          segmentProgress: 0,
          distanceRemainingKm: 0,
          etaSeconds: 0,
        })
      );

      setBudget((b) => b - cfg.cost);
      setBases((prev) => [...prev, newBase]);
      setVehicles((prev) => [...prev, ...spawnedVehicles]);
      setBuildModeType(null);
      setSelectedBaseId(baseId);
      setSelectedIncidentId(null);
      setSelectedVehicleId(null);

      soundEngine.playBuildBase();
      pushNotice(
        `${cfg.label} construída com ${cfg.initialVehicles} unidade(s) 3D prontas!`,
        'success'
      );
    },
    [budget, pushNotice]
  );

  // Upgrade base garage capacity
  const handleUpgradeBaseCapacity = useCallback(
    (baseId: string) => {
      const base = basesRef.current.find((b) => b.id === baseId);
      if (!base) return;
      const cost = 14000 * base.level;
      if (budget < cost) {
        soundEngine.playError();
        return;
      }

      setBudget((b) => b - cost);
      setBases((prev) =>
        prev.map((b) => (b.id === baseId ? { ...b, capacity: b.capacity + 2 } : b))
      );
      soundEngine.playBuildBase();
      pushNotice(`Garagem de ${base.name} expandida (+2 vagas).`, 'success');
    },
    [budget, pushNotice]
  );

  // Upgrade base dispatch speed
  const handleUpgradeBaseSpeed = useCallback(
    (baseId: string) => {
      const base = basesRef.current.find((b) => b.id === baseId);
      if (!base || base.level >= 4) return;
      const cost = 16000 * base.level;
      if (budget < cost) {
        soundEngine.playError();
        return;
      }

      setBudget((b) => b - cost);
      setBases((prev) =>
        prev.map((b) =>
          b.id === baseId ? { ...b, level: b.level + 1, dispatchBoost: b.dispatchBoost + 0.15 } : b
        )
      );
      soundEngine.playBuildBase();
      pushNotice(`Sistema de despacho de ${base.name} evoluído para Nível ${base.level + 1}!`, 'success');
    },
    [budget, pushNotice]
  );

  // Buy a new 3D vehicle at a base
  const handleBuyVehicle = useCallback(
    (baseId: string) => {
      const base = basesRef.current.find((b) => b.id === baseId);
      if (!base) return;
      const stationCount = vehiclesRef.current.filter((v) => v.baseId === baseId).length;
      if (stationCount >= base.capacity) {
        soundEngine.playError();
        pushNotice('Garagem lotada! Expanda a capacidade da base primeiro.', 'warning');
        return;
      }

      const baseCfg = BASE_CONFIGS[base.type];
      const vehCfg = VEHICLE_CONFIGS[baseCfg.defaultVehicleType];
      if (budget < vehCfg.cost) {
        soundEngine.playError();
        return;
      }

      const prefixMap: Record<BaseType, string> = {
        police: 'VTR',
        fire: 'ABT',
        medical: 'UTI',
        heliport: 'ÁGUIA',
      };
      const count = vehiclesRef.current.filter((v) => v.type === baseCfg.defaultVehicleType).length;

      const newVeh: Vehicle = {
        id: nextId('veh'),
        callsign: `${prefixMap[base.type]}-${100 + count + 1}`,
        type: baseCfg.defaultVehicleType,
        service: vehCfg.service,
        baseId: base.id,
        status: 'idle',
        position: offsetLngLat(base.position, (stationCount % 3) * 18 - 18, 16),
        bearing: (stationCount * 60) % 360,
        altitude: 0,
        speedKmh: vehCfg.speedKmh * base.dispatchBoost,
        assignedIncidentId: null,
        route: [],
        routeIndex: 0,
        segmentProgress: 0,
        distanceRemainingKm: 0,
        etaSeconds: 0,
      };

      setBudget((b) => b - vehCfg.cost);
      setVehicles((prev) => [...prev, newVeh]);
      soundEngine.playBuildBase();
      pushNotice(`Nova unidade ${newVeh.callsign} incorporada à frota 3D.`, 'success');
    },
    [budget, pushNotice]
  );

  // Switch city or restart shift
  const startNewShiftInCity = useCallback(
    (targetCity: CityPreset) => {
      const setup = createInitialCityState(targetCity);
      setCity(targetCity);
      setBases(setup.bases);
      setVehicles(setup.vehicles);
      setIncidents([]);
      setBudget(110000);
      setReputation(88);
      setResolvedCount(0);
      setExpiredCount(0);
      setSimSpeed(1);
      setGameOver(false);
      setBuildModeType(null);
      setSelectedBaseId(null);
      setSelectedIncidentId(null);
      setSelectedVehicleId(null);
      setFollowVehicleId(null);
      pushNotice(`Centro de Comando transferido para ${targetCity.name}.`, 'info');
    },
    [pushNotice]
  );

  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId) || null;
  const selectedBase = bases.find((b) => b.id === selectedBaseId) || null;
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) || null;

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0B0F14] select-none">
      {/* Full-Viewport 3D City Map + Three.js Vehicles */}
      <CityMapViewport
        city={city}
        mapStyle={mapStyle}
        bases={bases}
        vehicles={vehicles}
        incidents={incidents}
        buildModeType={buildModeType}
        selectedIncidentId={selectedIncidentId}
        selectedBaseId={selectedBaseId}
        selectedVehicleId={selectedVehicleId}
        followVehicleId={followVehicleId}
        cameraCommand={cameraCommand}
        onPlaceBase={handlePlaceBase}
        onSelectIncident={(id) => {
          setSelectedIncidentId(id);
          if (id) {
            setSelectedBaseId(null);
            setSelectedVehicleId(null);
          }
        }}
        onSelectBase={(id) => {
          setSelectedBaseId(id);
          if (id) {
            setSelectedIncidentId(null);
            setSelectedVehicleId(null);
          }
        }}
        onSelectVehicle={(id) => {
          setSelectedVehicleId(id);
          if (id) {
            setSelectedIncidentId(null);
            setSelectedBaseId(null);
          }
        }}
        onCancelFollow={() => setFollowVehicleId(null)}
      />

      {/* Top Command Bar */}
      <TopCommandBar
        city={city}
        budget={budget}
        reputation={reputation}
        resolvedCount={resolvedCount}
        activeIncidentCount={incidents.length}
        baseCount={bases.length}
        vehicleCount={vehicles.length}
        mapStyle={mapStyle}
        soundEnabled={soundEnabled}
        onOpenCityModal={() => setCityModalOpen(true)}
        onToggleMapStyle={() =>
          setMapStyle((prev) => (prev === 'tactical_dark' ? 'urban_3d' : 'tactical_dark'))
        }
        onToggleSound={() => {
          const next = !soundEnabled;
          soundEngine.enabled = next;
          setSoundEnabled(next);
        }}
      />

      {/* Active Incidents Queue */}
      <IncidentSidebar
        incidents={incidents}
        vehicles={vehicles}
        selectedIncidentId={selectedIncidentId}
        onSelectIncident={(id) => {
          setSelectedIncidentId(id);
          setSelectedBaseId(null);
          setSelectedVehicleId(null);
        }}
        onAutoDispatch={handleAutoDispatch}
        onFocusPoint={(lng, lat) =>
          setCameraCommand({ type: 'focus', point: { lng, lat }, nonce: Date.now() })
        }
      />

      {/* Contextual Inspector (Incident / Base / Vehicle) */}
      <InspectorPanel
        selectedIncident={selectedIncident}
        selectedBase={selectedBase}
        selectedVehicle={selectedVehicle}
        vehicles={vehicles}
        bases={bases}
        budget={budget}
        followVehicleId={followVehicleId}
        onClose={() => {
          setSelectedIncidentId(null);
          setSelectedBaseId(null);
          setSelectedVehicleId(null);
          setFollowVehicleId(null);
        }}
        onDispatchVehicle={dispatchVehicle}
        onAutoDispatch={handleAutoDispatch}
        onUpgradeBaseCapacity={handleUpgradeBaseCapacity}
        onUpgradeBaseSpeed={handleUpgradeBaseSpeed}
        onBuyVehicle={handleBuyVehicle}
        onToggleFollowVehicle={(vid) =>
          setFollowVehicleId((prev) => (prev === vid ? null : vid))
        }
        onRecallVehicle={returnVehicleToBase}
      />

      {/* Ephemeral Radio / Dispatch Toast */}
      {feedToast && !buildModeType && (
        <div
          className={`pointer-events-none fixed top-20 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-lg border shadow-xl text-xs font-medium flex items-center gap-2.5 ${
            feedToast.tone === 'success'
              ? 'bg-[#0F1622]/95 border-emerald-500/40 text-emerald-200'
              : feedToast.tone === 'danger'
              ? 'bg-[#0F1622]/95 border-rose-500/40 text-rose-200'
              : feedToast.tone === 'warning'
              ? 'bg-[#0F1622]/95 border-amber-500/40 text-amber-200'
              : 'bg-[#0F1622]/95 border-slate-700 text-slate-200'
          }`}
        >
          <span className="font-mono-tabular text-[11px] text-slate-400">{feedToast.timestamp}</span>
          <span>{feedToast.message}</span>
        </div>
      )}

      {/* Collapsible Bottom Control Dock */}
      <BottomControlDock
        budget={budget}
        buildModeType={buildModeType}
        simSpeed={simSpeed}
        onSelectBuildMode={setBuildModeType}
        onSetSimSpeed={setSimSpeed}
        onTogglePitch={() =>
          setCameraCommand({ type: 'pitch_toggle', nonce: Date.now() })
        }
        onResetCamera={() => {
          setFollowVehicleId(null);
          setCameraCommand({ type: 'reset', nonce: Date.now() });
        }}
      />

      {/* City Selection Modal */}
      <CitySelectorModal
        isOpen={cityModalOpen}
        currentCity={city}
        onSelectCity={startNewShiftInCity}
        onClose={() => setCityModalOpen(false)}
      />

      {/* Shift Game Over Modal */}
      {gameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-xl bg-[#0F1622] border border-rose-500/40 p-6 shadow-2xl space-y-4">
            <h2 className="font-display text-xl font-bold text-rose-400">
              Colapso Operacional em {city.name}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              A reputação dos serviços de emergência caiu abaixo do limite crítico devido a ocorrências
              não atendidas a tempo.
            </p>
            <div className="grid grid-cols-3 gap-3 py-3 border-y border-slate-800 text-center">
              <div>
                <span className="text-xs text-slate-400 block">Resolvidas</span>
                <span className="font-mono-tabular text-lg font-bold text-emerald-400">
                  {resolvedCount}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Expiradas</span>
                <span className="font-mono-tabular text-lg font-bold text-rose-400">
                  {expiredCount}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Bases</span>
                <span className="font-mono-tabular text-lg font-bold text-white">
                  {bases.length}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => startNewShiftInCity(city)}
                className="flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer"
              >
                Reiniciar Turno em {city.name}
              </button>
              <button
                onClick={() => setCityModalOpen(true)}
                className="py-2.5 px-4 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors cursor-pointer"
              >
                Outra Cidade
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
