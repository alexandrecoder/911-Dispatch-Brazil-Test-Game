import React from 'react';
import { Building2, Globe2, Layers, Volume2, VolumeX } from 'lucide-react';
import { CityPreset, MapVisualStyle } from '../types/game';

interface TopCommandBarProps {
  city: CityPreset;
  budget: number;
  reputation: number;
  resolvedCount: number;
  activeIncidentCount: number;
  baseCount: number;
  vehicleCount: number;
  mapStyle: MapVisualStyle;
  soundEnabled: boolean;
  onOpenCityModal: () => void;
  onToggleMapStyle: () => void;
  onToggleSound: () => void;
}

export const TopCommandBar: React.FC<TopCommandBarProps> = ({
  city,
  budget,
  reputation,
  resolvedCount,
  activeIncidentCount,
  baseCount,
  vehicleCount,
  mapStyle,
  soundEnabled,
  onOpenCityModal,
  onToggleMapStyle,
  onToggleSound,
}) => {
  const repColor =
    reputation >= 70 ? 'text-emerald-400' : reputation >= 40 ? 'text-amber-400' : 'text-rose-400';

  return (
    <header className="fixed top-3 left-3 right-3 z-30 flex items-center justify-between gap-4 px-4 py-2.5 rounded-xl bg-[#0F1622]/94 border border-slate-800/90 shadow-2xl pointer-events-auto">
      {/* Zone 1: Brand Title */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-display text-base md:text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0">
          CentrOps 190/193
        </span>
        <span className="hidden sm:inline text-slate-600" aria-hidden="true">
          /
        </span>
        <button
          onClick={onOpenCityModal}
          className="flex items-center gap-1.5 text-xs md:text-sm font-medium text-slate-200 hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="Trocar cidade real de operação"
        >
          <Globe2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate max-w-[140px] md:max-w-[200px]">{city.name}</span>
          <span className="hidden lg:inline text-slate-500 font-normal">· {city.country}</span>
        </button>
      </div>

      {/* Zone 2: Key Operational Metrics (Clean Unboxed Tabular Typography) */}
      <div className="hidden md:flex items-center gap-5 text-xs text-slate-300">
        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="text-slate-400">Orçamento</span>
          <span className="font-mono-tabular font-semibold text-sm text-emerald-400">
            R$ {budget.toLocaleString('pt-BR')}
          </span>
        </div>

        <span className="text-slate-700" aria-hidden="true">
          ·
        </span>

        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="text-slate-400">Reputação</span>
          <span className={`font-mono-tabular font-semibold text-sm ${repColor}`}>
            {Math.round(reputation)}%
          </span>
        </div>

        <span className="text-slate-700" aria-hidden="true">
          ·
        </span>

        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="text-slate-400">Ocorrências</span>
          <span className="font-mono-tabular font-semibold text-sm text-white">
            {activeIncidentCount} ativas
          </span>
          <span className="text-slate-500">/</span>
          <span className="font-mono-tabular text-slate-300">{resolvedCount} resolvidas</span>
        </div>

        <span className="hidden xl:inline text-slate-700" aria-hidden="true">
          ·
        </span>

        <div className="hidden xl:flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="text-slate-400">Frota</span>
          <span className="font-mono-tabular font-medium text-slate-200">
            {baseCount} bases · {vehicleCount} veículos 3D
          </span>
        </div>
      </div>

      {/* Zone 3: Map Style & Sound Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onToggleMapStyle}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700/70 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="Alternar entre Mapa Tático Escuro e Mapa com Prédios 3D"
        >
          {mapStyle === 'tactical_dark' ? (
            <>
              <Building2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Prédios 3D</span>
            </>
          ) : (
            <>
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Modo Tático</span>
            </>
          )}
        </button>

        <button
          onClick={onToggleSound}
          className="p-2 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 text-slate-300 border border-slate-700/70 transition-colors shrink-0 cursor-pointer"
          aria-label={soundEnabled ? 'Silenciar rádio' : 'Ativar som do rádio'}
          title={soundEnabled ? 'Silenciar rádio' : 'Ativar som do rádio'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
        </button>

        <button
          onClick={onOpenCityModal}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Mudar Cidade
        </button>
      </div>
    </header>
  );
};
