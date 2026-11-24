import React from 'react';
import {
  ArrowUpCircle,
  Crosshair,
  Flame,
  HeartPulse,
  Navigation,
  Plus,
  RotateCcw,
  Shield,
  X,
} from 'lucide-react';
import {
  BASE_CONFIGS,
  BaseStation,
  Incident,
  Vehicle,
  VEHICLE_CONFIGS,
} from '../types/game';
import { haversineKm } from '../services/routing';

interface InspectorPanelProps {
  selectedIncident: Incident | null;
  selectedBase: BaseStation | null;
  selectedVehicle: Vehicle | null;
  vehicles: Vehicle[];
  bases: BaseStation[];
  budget: number;
  followVehicleId: string | null;
  onClose: () => void;
  onDispatchVehicle: (vehicleId: string, incidentId: string) => void;
  onAutoDispatch: (incidentId: string) => void;
  onUpgradeBaseCapacity: (baseId: string) => void;
  onUpgradeBaseSpeed: (baseId: string) => void;
  onBuyVehicle: (baseId: string) => void;
  onToggleFollowVehicle: (vehicleId: string) => void;
  onRecallVehicle: (vehicleId: string) => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  selectedIncident,
  selectedBase,
  selectedVehicle,
  vehicles,
  bases,
  budget,
  followVehicleId,
  onClose,
  onDispatchVehicle,
  onAutoDispatch,
  onUpgradeBaseCapacity,
  onUpgradeBaseSpeed,
  onBuyVehicle,
  onToggleFollowVehicle,
  onRecallVehicle,
}) => {
  if (!selectedIncident && !selectedBase && !selectedVehicle) {
    return null;
  }

  return (
    <aside className="fixed top-20 right-3 z-20 w-[330px] max-h-[calc(100vh-195px)] flex flex-col rounded-xl bg-[#0F1622]/94 border border-slate-800/90 shadow-2xl pointer-events-auto overflow-hidden">
      {/* INCIDENT INSPECTOR */}
      {selectedIncident && (
        <>
          <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-slate-800/90">
            <div>
              <span className="font-mono-tabular text-xs text-amber-400">
                {selectedIncident.code} · {selectedIncident.district}
              </span>
              <h2 className="font-display text-base font-bold text-white leading-tight mt-0.5">
                {selectedIncident.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Fechar inspetor"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4 overflow-y-auto command-scroll">
            <p className="text-xs text-slate-300 leading-relaxed">{selectedIncident.description}</p>

            <div className="flex items-center justify-between text-xs py-2 border-y border-slate-800/80">
              <div>
                <span className="text-slate-400 block">Recompensa</span>
                <span className="font-mono-tabular font-semibold text-emerald-400">
                  +R$ {selectedIncident.reward.toLocaleString('pt-BR')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Tempo Restante</span>
                <span className="font-mono-tabular font-semibold text-white">
                  {Math.ceil(selectedIncident.remainingSec)}s
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Atendimento</span>
                <span className="font-mono-tabular font-semibold text-sky-400">
                  {Math.round(
                    (selectedIncident.resolveProgressSec / selectedIncident.resolveDurationSec) * 100
                  )}
                  %
                </span>
              </div>
            </div>

            <button
              onClick={() => onAutoDispatch(selectedIncident.id)}
              className="w-full py-2 px-4 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer"
            >
              Despacho Inteligente (Mais Próximos)
            </button>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-300">
                Unidades Disponíveis / Próximas
              </h3>
              <div className="space-y-1.5">
                {vehicles
                  .filter(
                    (v) =>
                      v.status === 'idle' ||
                      v.status === 'returning' ||
                      v.assignedIncidentId === selectedIncident.id
                  )
                  .map((v) => ({
                    vehicle: v,
                    distKm: haversineKm(v.position, selectedIncident.position),
                  }))
                  .sort((a, b) => a.distKm - b.distKm)
                  .slice(0, 8)
                  .map(({ vehicle, distKm }) => {
                    const cfg = VEHICLE_CONFIGS[vehicle.type];
                    const isAssignedHere = vehicle.assignedIncidentId === selectedIncident.id;
                    const etaSec = Math.max(
                      3,
                      Math.round((distKm / (vehicle.speedKmh / 3600)) * 0.25)
                    );

                    return (
                      <div
                        key={vehicle.id}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-800/80"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                            {vehicle.service === 'police' && (
                              <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            )}
                            {vehicle.service === 'fire' && (
                              <Flame className="w-3.5 h-3.5 text-red-400 shrink-0" />
                            )}
                            {vehicle.service === 'medical' && (
                              <HeartPulse className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            )}
                            {vehicle.service === 'air' && (
                              <Navigation className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            )}
                            <span className="truncate">{vehicle.callsign}</span>
                          </div>
                          <div className="text-[11px] font-mono-tabular text-slate-400 mt-0.5">
                            {cfg.shortLabel} · {distKm.toFixed(2)} km · ~{etaSec}s
                          </div>
                        </div>

                        {isAssignedHere ? (
                          <span className="text-[11px] font-semibold text-emerald-400 whitespace-nowrap">
                            {vehicle.status === 'on_scene' ? 'No Local' : 'Em Rota'}
                          </span>
                        ) : (
                          <button
                            onClick={() => onDispatchVehicle(vehicle.id, selectedIncident.id)}
                            className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors shrink-0 cursor-pointer"
                          >
                            Enviar
                          </button>
                        )}
                      </div>
                    );
                  })}

                {vehicles.length === 0 && (
                  <p className="text-xs text-slate-500">
                    Construa uma base no painel inferior para adquirir veículos 3D.
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* BASE STATION INSPECTOR */}
      {!selectedIncident && selectedBase && (() => {
        const cfg = BASE_CONFIGS[selectedBase.type];
        const stationVehicles = vehicles.filter((v) => v.baseId === selectedBase.id);
        const vehicleCost = VEHICLE_CONFIGS[cfg.defaultVehicleType].cost;
        const capUpgradeCost = 14000 * selectedBase.level;
        const speedUpgradeCost = 16000 * selectedBase.level;
        const canBuyVehicle = stationVehicles.length < selectedBase.capacity && budget >= vehicleCost;

        return (
          <>
            <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-slate-800/90">
              <div>
                <span className="text-xs font-semibold" style={{ color: cfg.color }}>
                  {cfg.label} · Nível {selectedBase.level}
                </span>
                <h2 className="font-display text-base font-bold text-white leading-tight mt-0.5">
                  {selectedBase.name}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Fechar inspetor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto command-scroll">
              <div className="flex items-center justify-between text-xs py-2 border-b border-slate-800/80">
                <div>
                  <span className="text-slate-400 block">Garagem</span>
                  <span className="font-mono-tabular font-semibold text-white">
                    {stationVehicles.length} / {selectedBase.capacity} vagas
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Bônus Despacho</span>
                  <span className="font-mono-tabular font-semibold text-amber-400">
                    +{Math.round((selectedBase.dispatchBoost - 1) * 100)}% vel.
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Cobertura</span>
                  <span className="font-mono-tabular font-semibold text-slate-200">
                    {(cfg.coverageKm * (1 + (selectedBase.level - 1) * 0.15)).toFixed(1)} km
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => onBuyVehicle(selectedBase.id)}
                  disabled={!canBuyVehicle}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 disabled:opacity-40 disabled:cursor-not-allowed text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    Comprar {VEHICLE_CONFIGS[cfg.defaultVehicleType].shortLabel}
                  </span>
                  <span className="font-mono-tabular">R$ {vehicleCost.toLocaleString('pt-BR')}</span>
                </button>

                <button
                  onClick={() => onUpgradeBaseCapacity(selectedBase.id)}
                  disabled={budget < capUpgradeCost}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium bg-slate-800/90 hover:bg-slate-700/90 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 border border-slate-700/80 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <ArrowUpCircle className="w-3.5 h-3.5 text-sky-400" />
                    Expandir Garagem (+2 vagas)
                  </span>
                  <span className="font-mono-tabular">R$ {capUpgradeCost.toLocaleString('pt-BR')}</span>
                </button>

                <button
                  onClick={() => onUpgradeBaseSpeed(selectedBase.id)}
                  disabled={budget < speedUpgradeCost || selectedBase.level >= 4}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium bg-slate-800/90 hover:bg-slate-700/90 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 border border-slate-700/80 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <ArrowUpCircle className="w-3.5 h-3.5 text-amber-400" />
                    {selectedBase.level >= 4 ? 'Despacho no Nível Máximo' : 'Melhorar Despacho (+15% vel.)'}
                  </span>
                  {selectedBase.level < 4 && (
                    <span className="font-mono-tabular">
                      R$ {speedUpgradeCost.toLocaleString('pt-BR')}
                    </span>
                  )}
                </button>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold text-slate-300">Unidades Alocadas</h3>
                {stationVehicles.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-800/80 text-xs"
                  >
                    <span className="font-medium text-white">{v.callsign}</span>
                    <span className="text-slate-400">
                      {v.status === 'idle'
                        ? 'Na Base'
                        : v.status === 'en_route'
                        ? 'Em Deslocamento'
                        : v.status === 'on_scene'
                        ? 'No Local'
                        : 'Retornando'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        );
      })()}

      {/* VEHICLE INSPECTOR */}
      {!selectedIncident && !selectedBase && selectedVehicle && (() => {
        const cfg = VEHICLE_CONFIGS[selectedVehicle.type];
        const homeBase = bases.find((b) => b.id === selectedVehicle.baseId);
        const isFollowing = followVehicleId === selectedVehicle.id;

        return (
          <>
            <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-slate-800/90">
              <div>
                <span className="text-xs font-semibold" style={{ color: cfg.color }}>
                  {cfg.label}
                </span>
                <h2 className="font-display text-base font-bold text-white leading-tight mt-0.5">
                  {selectedVehicle.callsign}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Fechar inspetor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs py-2 border-b border-slate-800/80">
                <div>
                  <span className="text-slate-400 block">Status Atual</span>
                  <span className="font-semibold text-white">
                    {selectedVehicle.status === 'idle'
                      ? 'Disponível na Base'
                      : selectedVehicle.status === 'en_route'
                      ? 'Em Deslocamento'
                      : selectedVehicle.status === 'on_scene'
                      ? 'Em Atendimento'
                      : 'Retornando à Base'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Velocidade Nominal</span>
                  <span className="font-mono-tabular font-semibold text-slate-200">
                    {selectedVehicle.speedKmh} km/h
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Base de Origem</span>
                  <span className="text-slate-200 truncate block">{homeBase?.name || 'Central'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">ETA Estimado</span>
                  <span className="font-mono-tabular font-semibold text-amber-400">
                    {selectedVehicle.etaSeconds > 0 ? `${Math.ceil(selectedVehicle.etaSeconds)}s` : '—'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleFollowVehicle(selectedVehicle.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    isFollowing
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                  }`}
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>{isFollowing ? 'Seguindo 3D' : 'Seguir Câmera'}</span>
                </button>

                {selectedVehicle.status !== 'idle' && selectedVehicle.status !== 'returning' && (
                  <button
                    onClick={() => onRecallVehicle(selectedVehicle.id)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Recolher</span>
                  </button>
                )}
              </div>
            </div>
          </>
        );
      })()}
    </aside>
  );
};
