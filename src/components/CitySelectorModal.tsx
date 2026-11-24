import React, { useState } from 'react';
import { Globe2, MapPin, Search, X } from 'lucide-react';
import { CITY_PRESETS, searchRealCity } from '../data/cities';
import { CityPreset } from '../types/game';

interface CitySelectorModalProps {
  isOpen: boolean;
  currentCity: CityPreset;
  onSelectCity: (city: CityPreset) => void;
  onClose: () => void;
}

export const CitySelectorModal: React.FC<CitySelectorModalProps> = ({
  isOpen,
  currentCity,
  onSelectCity,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<CityPreset[]>([]);
  const [searchError, setSearchError] = useState('');

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError('');
    const results = await searchRealCity(query);
    setSearching(false);
    if (results.length === 0) {
      setSearchError('Nenhuma cidade encontrada para essa busca. Tente outro nome.');
    }
    setSearchResults(results);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-[#0F1622] border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="font-display text-lg font-bold text-white">
              Selecionar Cidade Real de Operação
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Escolha uma metrópole ou pesquise qualquer cidade do mundo via OpenStreetMap.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Fechar seleção de cidade"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto command-scroll">
          {/* Global real city search */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar cidade real (ex: Belo Horizonte, Paris, Madrid, Osaka)..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
            <button
              type="submit"
              disabled={searching || !query.trim()}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {searching ? 'Buscando...' : 'Buscar'}
            </button>
          </form>

          {searchError && <p className="text-xs text-rose-400">{searchError}</p>}

          {searchResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-amber-400">Resultados da Busca</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {searchResults.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelectCity(c);
                      onClose();
                    }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-left transition-colors cursor-pointer"
                  >
                    <MapPin className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{c.name}</div>
                      <div className="text-xs text-slate-400 truncate">{c.subtitle}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Curated presets */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold text-slate-300">Cidades Recomendadas</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CITY_PRESETS.map((c) => {
                const isCurrent = c.id === currentCity.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelectCity(c);
                      onClose();
                    }}
                    className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-amber-500/10 border-amber-500/60'
                        : 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-800'
                    }`}
                  >
                    <Globe2
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        isCurrent ? 'text-amber-400' : 'text-slate-400'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{c.name}</span>
                        <span className="text-xs text-slate-500">{c.country}</span>
                      </div>
                      <div className="text-xs text-slate-400 truncate mt-0.5">{c.subtitle}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] text-slate-500 border-t border-slate-800/80 pt-3">
            Mapas vetoriais 3D gratuitos via OpenStreetMap / OpenFreeMap e rotas reais via OSRM, sem
            necessidade de chave de API. Trocar de cidade inicia um novo turno.
          </p>
        </div>
      </div>
    </div>
  );
};
