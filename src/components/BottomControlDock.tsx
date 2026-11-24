import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Compass,
  Flame,
  HeartPulse,
  Pause,
  Plane,
  Play,
  RotateCcw,
  Shield,
} from 'lucide-react';
import { BASE_CONFIGS, BaseType } from '../types/game';

interface BottomControlDockProps {
  budget: number;
  buildModeType: BaseType | null;
  simSpeed: 0 | 1 | 2 | 4;
  onSelectBuildMode: (type: BaseType | null) => void;
  onSetSimSpeed: (speed: 0 | 1 | 2 | 4) => void;
  onTogglePitch: () => void;
  onResetCamera: () => void;
}

const BUILD_OPTIONS: Array<{
  type: BaseType;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { type: 'police', icon: Shield },
  { type: 'fire', icon: Flame },
  { type: 'medical', icon: HeartPulse },
  { type: 'heliport', icon: Plane },
];

export const BottomControlDock: React.FC<BottomControlDockProps> = ({
  budget,
  buildModeType,
  simSpeed,
  onSelectBuildMode,
  onSetSimSpeed,
  onTogglePitch,
  onResetCamera,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none max-w-[96vw]">
      {/* Collapse / Expand toggle tab */}
      <button
        onClick={() => setCollapsed((prev) => !prev)}
        className="pointer-events-auto mb-1.5 flex items-center gap-1.5 px-3 py-1 rounded-t-lg rounded-b-md bg-[#0F1622]/94 border border-slate-800/90 text-[11px] font-medium text-slate-300 hover:text-white transition-colors shadow-lg cursor-pointer"
      >
        {collapsed ? (
          <>
            <ChevronUp className="w-3.5 h-3.5" />
            <span>Mostrar Controles</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5" />
            <span>Ocultar Controles</span>
          </>
        )}
      </button>

      {!collapsed && (
        <div className="pointer-events-auto flex flex-wrap md:flex-nowrap items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-[#0F1622]/94 border border-slate-800/90 shadow-2xl">
          {/* Base Construction Buttons */}
          <div className="flex items-center gap-1.5">
            {BUILD_OPTIONS.map(({ type, icon: Icon }) => {
              const cfg = BASE_CONFIGS[type];
              const isActive = buildModeType === type;
              const canAfford = budget >= cfg.cost;

              return (
                <button
                  key={type}
                  onClick={() => onSelectBuildMode(isActive ? null : type)}
                  disabled={!canAfford && !isActive}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-semibold'
                      : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-800'
                  }`}
                  title={cfg.description}
                >
                  <span style={{ color: isActive ? '#0F172A' : cfg.color }}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span>{cfg.shortLabel}</span>
                  <span
                    className={`font-mono-tabular text-[11px] ${
                      isActive ? 'text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    R$ {(cfg.cost / 1000).toFixed(0)}k
                  </span>
                </button>
              );
            })}
          </div>

          <div className="hidden md:block w-px h-6 bg-slate-800" aria-hidden="true" />

          {/* Simulation Speed Controls */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => onSetSimSpeed(0)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                simSpeed === 0
                  ? 'bg-rose-500/20 text-rose-300'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Pausar simulação"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
            {([1, 2, 4] as const).map((spd) => (
              <button
                key={spd}
                onClick={() => onSetSimSpeed(spd)}
                className={`flex items-center gap-0.5 px-2 py-1 rounded text-xs font-mono-tabular font-medium transition-colors cursor-pointer ${
                  simSpeed === spd
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={`Velocidade ${spd}x`}
              >
                {spd === 1 && <Play className="w-3 h-3 mr-0.5" />}
                {spd}x
              </button>
            ))}
          </div>

          <div className="hidden md:block w-px h-6 bg-slate-800" aria-hidden="true" />

          {/* 3D Camera Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onTogglePitch}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Alternar inclinação 3D / visão aérea"
            >
              <Compass className="w-3.5 h-3.5 text-sky-400" />
              <span>Ângulo 3D</span>
            </button>
            <button
              onClick={onResetCamera}
              className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors shrink-0 cursor-pointer"
              title="Centralizar câmera na cidade"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
