export type BaseType = 'police' | 'fire' | 'medical' | 'heliport';

export type VehicleType = 'police_suv' | 'fire_truck' | 'ambulance' | 'rescue_heli';

export type EmergencyServiceCategory = 'police' | 'fire' | 'medical';

export type IncidentSeverity = 'moderate' | 'high' | 'critical';

export type VehicleStatus = 'idle' | 'en_route' | 'on_scene' | 'returning';

export type MapVisualStyle = 'tactical_dark' | 'urban_3d';

export interface LngLatPoint {
  lng: number;
  lat: number;
}

export interface CityPreset {
  id: string;
  name: string;
  country: string;
  subtitle: string;
  center: LngLatPoint;
  zoom: number;
  pitch: number;
  bearing: number;
  districts: string[];
  radiusKm: number;
}

export interface BaseStation {
  id: string;
  name: string;
  type: BaseType;
  position: LngLatPoint;
  level: number;
  capacity: number;
  dispatchBoost: number; // speed multiplier (1.0, 1.18, 1.35)
  createdAt: number;
}

export interface Vehicle {
  id: string;
  callsign: string;
  type: VehicleType;
  service: EmergencyServiceCategory | 'air';
  baseId: string;
  status: VehicleStatus;
  position: LngLatPoint;
  bearing: number; // degrees clockwise from North
  altitude: number; // meters above ground (0 for ground, >0 for helicopter)
  speedKmh: number;
  assignedIncidentId: string | null;
  route: LngLatPoint[];
  routeIndex: number;
  segmentProgress: number;
  distanceRemainingKm: number;
  etaSeconds: number;
}

export interface IncidentRequirement {
  police: number;
  fire: number;
  medical: number;
}

export interface Incident {
  id: string;
  code: string;
  title: string;
  description: string;
  district: string;
  severity: IncidentSeverity;
  position: LngLatPoint;
  required: IncidentRequirement;
  assignedVehicleIds: string[];
  arrivedVehicleIds: string[];
  timeLimitSec: number;
  remainingSec: number;
  resolveDurationSec: number;
  resolveProgressSec: number;
  reward: number;
  reputationPenalty: number;
  createdAt: number;
}

export interface DispatchFeedEntry {
  id: string;
  timestamp: string;
  message: string;
  tone: 'info' | 'success' | 'warning' | 'danger';
}

export interface BaseConfig {
  type: BaseType;
  label: string;
  shortLabel: string;
  description: string;
  cost: number;
  initialCapacity: number;
  initialVehicles: number;
  defaultVehicleType: VehicleType;
  color: string;
  coverageKm: number;
}

export interface VehicleConfig {
  type: VehicleType;
  label: string;
  shortLabel: string;
  service: EmergencyServiceCategory | 'air';
  cost: number;
  speedKmh: number;
  color: string;
  isAir: boolean;
}

export const BASE_CONFIGS: Record<BaseType, BaseConfig> = {
  police: {
    type: 'police',
    label: 'Delegacia de Polícia',
    shortLabel: 'Delegacia',
    description: 'Patrulha urbana, interceptação e controle de vias. Inclui 2 Viaturas SUV.',
    cost: 25000,
    initialCapacity: 3,
    initialVehicles: 2,
    defaultVehicleType: 'police_suv',
    color: '#3B82F6',
    coverageKm: 2.8,
  },
  fire: {
    type: 'fire',
    label: 'Quartel de Bombeiros',
    shortLabel: 'Bombeiros',
    description: 'Combate a incêndios, resgates pesados e desastres. Inclui 2 Caminhões ABT.',
    cost: 35000,
    initialCapacity: 3,
    initialVehicles: 2,
    defaultVehicleType: 'fire_truck',
    color: '#EF4444',
    coverageKm: 3.2,
  },
  medical: {
    type: 'medical',
    label: 'Base SAMU / Trauma',
    shortLabel: 'SAMU',
    description: 'Atendimento pré-hospitalar e remoção UTI. Inclui 2 Ambulâncias UTI.',
    cost: 30000,
    initialCapacity: 3,
    initialVehicles: 2,
    defaultVehicleType: 'ambulance',
    color: '#10B981',
    coverageKm: 3.0,
  },
  heliport: {
    type: 'heliport',
    label: 'Heliponto Águia',
    shortLabel: 'Heliponto',
    description: 'Apoio aéreo rápido em linha reta para qualquer tipo de ocorrência. Inclui 1 Helicóptero.',
    cost: 65000,
    initialCapacity: 2,
    initialVehicles: 1,
    defaultVehicleType: 'rescue_heli',
    color: '#F59E0B',
    coverageKm: 6.5,
  },
};

export const VEHICLE_CONFIGS: Record<VehicleType, VehicleConfig> = {
  police_suv: {
    type: 'police_suv',
    label: 'Viatura Tática SUV',
    shortLabel: 'Viatura 190',
    service: 'police',
    cost: 9000,
    speedKmh: 84,
    color: '#3B82F6',
    isAir: false,
  },
  fire_truck: {
    type: 'fire_truck',
    label: 'Caminhão Auto Bomba (ABT)',
    shortLabel: 'ABT 193',
    service: 'fire',
    cost: 15000,
    speedKmh: 66,
    color: '#EF4444',
    isAir: false,
  },
  ambulance: {
    type: 'ambulance',
    label: 'Ambulância UTI Móvel',
    shortLabel: 'SAMU 192',
    service: 'medical',
    cost: 12000,
    speedKmh: 78,
    color: '#10B981',
    isAir: false,
  },
  rescue_heli: {
    type: 'rescue_heli',
    label: 'Helicóptero Resgate Águia',
    shortLabel: 'Águia Aéreo',
    service: 'air',
    cost: 35000,
    speedKmh: 165,
    color: '#F59E0B',
    isAir: true,
  },
};
