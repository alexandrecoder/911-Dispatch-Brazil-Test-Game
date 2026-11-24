import React from 'react';
import { AlertTriangle, Flame, HeartPulse, Shield, Zap } from 'lucide-react';
import { Incident, Vehicle } from '../types/game';

interface IncidentSidebarProps {
  incidents: Incident[];
  vehicles: Vehicle[];
  selectedIncidentId: string | null;
  onSelectIncident: (id: string) => void;
  onAutoDispatch: (incidentId: string) => void;
  onFocusPoint: (lng: number, lat: number) => void;
}

const SEVERITY_META = {
  critical: { label: 'Crítico', textClass: 'text-rose-400', barClass: 'bg-rose-500' },
  high: { label: 'Alto', textClass: 'text-amber-400', barClass: 'bg-amber-500' },
  moderate: { label: 'Moderado', textClass: 'text-sky-400', barClass: 'bg-sky-400' },
} as const;

export const IncidentSidebar: React.FC<IncidentSidebarProps> = ({
  incidents,
  vehicles,
  selectedIncidentId,
  onSelectIncident,
  onAutoDispatch,
  onFocusPoint,
}) => {
  return (
    <aside className="fixed top-20 left-3 z-20 w-[310px] max-h-[calc(100vh-195px)] flex flex-col rounded-xl bg-[#0F1622]/94 border border-slate-800/90 shadow-2xl pointer-events-auto overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/90">
        <h2 className="font-display text-sm font-semibold text-white tracking-tight">
          Central de Ocorrências
        </h2>
        <span className="font-mono-tabular text-xs text-slate-400">
          {incidents.length} {incidents.length === 1 ? 'chamado' : 'chamados'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto command-scroll divide-y divide-slate-800/70">
        {incidents.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-slate-400 space-y-1">
            <p className="font-medium text-slate-300">Nenhuma ocorrência ativa no momento</p>
            <p className="text-slate-500">
              Construa bases estratégicas no mapa e aguarde novos chamados 190/192/193.
            </p>
          </div>
        ) : (
          incidents.map((inc) => {
            const meta = SEVERITY_META[inc.severity];
            const isSelected = inc.id === selectedIncidentId;
            const timePct = Math.max(0, Math.min(100, (inc.remainingSec / inc.timeLimitSec) * 100));
            const resolvePct = Math.max(
              0,
              Math.min(100, (inc.resolveProgressSec / inc.resolveDurationSec) * 100)
            );
            const assignedVehs = vehicles.filter((v) => inc.assignedVehicleIds.includes(v.id));
            const isResolving = inc.resolveProgressSec > 0;

            return (
              <div
                key={inc.id}
                onClick={() => {
                  onSelectIncident(inc.id);
                  onFocusPoint(inc.position.lng, inc.position.lat);
                }}
                className={`px-4 py-3 transition-colors cursor-pointer ${
                  isSelected ? 'bg-slate-800/85' : 'hover:bg-slate-800/45'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs mb-1">
                  <div className={`flex items-center gap-1.5 font-semibold ${meta.textClass}`}>
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{meta.label}</span>
                    <span className="text-slate-600" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-mono-tabular text-slate-400 font-normal">{inc.code}</span>
                  </div>
                  <span className="font-mono-tabular text-slate-300">
                    {Math.ceil(inc.remainingSec)}s
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-white leading-snug">{inc.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  {inc.district} · +R$ {inc.reward.toLocaleString('pt-BR')}
                </p>

                {/* Required units breakdown */}
                <div className="flex items-center justify-between gap-2 mt-2.5">
                  <div className="flex items-center gap-3 text-xs font-mono-tabular">
                    {inc.required.police > 0 && (
                      <span className="flex items-center gap-1 text-blue-400">
                        <Shield className="w-3.5 h-3.5" />
                        {assignedVehs.filter((v) => v.service === 'police').length}/{inc.required.police}
                      </span>
                    )}
                    {inc.required.fire > 0 && (
                      <span className="flex items-center gap-1 text-red-400">
                        <Flame className="w-3.5 h-3.5" />
                        {assignedVehs.filter((v) => v.service === 'fire').length}/{inc.required.fire}
                      </span>
                    )}
                    {inc.required.medical > 0 && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <HeartPulse className="w-3.5 h-3.5" />
                        {assignedVehs.filter((v) => v.service === 'medical').length}/{inc.required.medical}
                      </span>
                    )}
                    {assignedVehs.some((v) => v.service === 'air') && (
                      <span className="text-amber-400">
                        +{assignedVehs.filter((v) => v.service === 'air').length} Águia
                      </span>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAutoDispatch(inc.id);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    title="Despachar automaticamente as unidades disponíveis mais próximas"
                  >
                    <Zap className="w-3 h-3" />
                    <span>Despachar</span>
                  </button>
                </div>

                {/* Progress / Remaining timer bar */}
                <div className="mt-2.5 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  {isResolving ? (
                    <div
                      className="h-full bg-emerald-400 transition-all duration-150"
                      style={{ width: `${resolvePct}%` }}
                    />
                  ) : (
                    <div
                      className={`h-full ${meta.barClass} transition-all duration-150`}
                      style={{ width: `${timePct}%` }}
                    />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
