import { CityPreset, IncidentRequirement, IncidentSeverity } from '../types/game';

export const CITY_PRESETS: CityPreset[] = [
  {
    id: 'sao-paulo',
    name: 'São Paulo',
    country: 'Brasil',
    subtitle: 'Av. Paulista · Centro · Pinheiros',
    center: { lng: -46.6544, lat: -23.5614 },
    zoom: 14.3,
    pitch: 56,
    bearing: -18,
    districts: ['Bela Vista', 'Jardins', 'Consolação', 'Pinheiros', 'República', 'Vila Mariana', 'Paraíso', 'Itaim Bibi'],
    radiusKm: 3.8,
  },
  {
    id: 'rio-de-janeiro',
    name: 'Rio de Janeiro',
    country: 'Brasil',
    subtitle: 'Centro · Botafogo · Copacabana',
    center: { lng: -43.1823, lat: -22.9268 },
    zoom: 14.1,
    pitch: 55,
    bearing: 14,
    districts: ['Centro', 'Flamengo', 'Botafogo', 'Laranjeiras', 'Glória', 'Catete', 'Copacabana', 'Santa Teresa'],
    radiusKm: 3.6,
  },
  {
    id: 'curitiba',
    name: 'Curitiba',
    country: 'Brasil',
    subtitle: 'Centro Cívico · Batel · Água Verde',
    center: { lng: -49.2719, lat: -25.4296 },
    zoom: 14.4,
    pitch: 54,
    bearing: -12,
    districts: ['Centro', 'Batel', 'Água Verde', 'Centro Cívico', 'Alto da XV', 'Rebouças', 'Mercês', 'Juvevê'],
    radiusKm: 3.4,
  },
  {
    id: 'lisboa',
    name: 'Lisboa',
    country: 'Portugal',
    subtitle: 'Baixa · Marquês de Pombal · Avenidas Novas',
    center: { lng: -9.1456, lat: 38.7223 },
    zoom: 14.5,
    pitch: 56,
    bearing: 10,
    districts: ['Baixa', 'Chiado', 'Marquês de Pombal', 'Saldanha', 'Alfama', 'Príncipe Real', 'Estrela', 'Arroios'],
    radiusKm: 3.2,
  },
  {
    id: 'new-york',
    name: 'Nova York',
    country: 'Estados Unidos',
    subtitle: 'Midtown Manhattan · Times Square · Chelsea',
    center: { lng: -73.9855, lat: 40.7549 },
    zoom: 14.6,
    pitch: 58,
    bearing: 28,
    districts: ['Midtown', 'Hell’s Kitchen', 'Chelsea', 'Murray Hill', 'Gramercy', 'SoHo', 'Upper West', 'Theater District'],
    radiusKm: 3.2,
  },
  {
    id: 'tokyo',
    name: 'Tóquio',
    country: 'Japão',
    subtitle: 'Shibuya · Shinjuku · Minato',
    center: { lng: 139.7016, lat: 35.6628 },
    zoom: 14.5,
    pitch: 56,
    bearing: -24,
    districts: ['Shibuya', 'Harajuku', 'Aoyama', 'Roppongi', 'Ebisu', 'Shinjuku Sul', 'Omotesando', 'Daikanyama'],
    radiusKm: 3.4,
  },
  {
    id: 'london',
    name: 'Londres',
    country: 'Reino Unido',
    subtitle: 'Westminster · Soho · South Bank',
    center: { lng: -0.1276, lat: 51.5072 },
    zoom: 14.4,
    pitch: 54,
    bearing: -10,
    districts: ['Westminster', 'Soho', 'Covent Garden', 'Mayfair', 'South Bank', 'Fitzrovia', 'Holborn', 'Victoria'],
    radiusKm: 3.3,
  },
];

export interface IncidentTemplate {
  code: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  required: IncidentRequirement;
  timeLimitSec: number;
  resolveDurationSec: number;
  reward: number;
  reputationPenalty: number;
}

export const INCIDENT_TEMPLATES: IncidentTemplate[] = [
  {
    code: 'COD-190-A',
    title: 'Assalto em Estabelecimento',
    description: 'Suspeitos armados rendendo clientes em área comercial.',
    severity: 'high',
    required: { police: 1, fire: 0, medical: 0 },
    timeLimitSec: 95,
    resolveDurationSec: 12,
    reward: 4800,
    reputationPenalty: 7,
  },
  {
    code: 'COD-190-B',
    title: 'Perseguição e Bloqueio de Via',
    description: 'Veículo em fuga trafegando na contramão em avenida movimentada.',
    severity: 'high',
    required: { police: 2, fire: 0, medical: 0 },
    timeLimitSec: 90,
    resolveDurationSec: 14,
    reward: 6500,
    reputationPenalty: 9,
  },
  {
    code: 'COD-190-C',
    title: 'Distúrbio e Aglomeração Crítica',
    description: 'Confronto próximo a estação de transporte público.',
    severity: 'moderate',
    required: { police: 1, fire: 0, medical: 0 },
    timeLimitSec: 115,
    resolveDurationSec: 10,
    reward: 3600,
    reputationPenalty: 5,
  },
  {
    code: 'COD-193-A',
    title: 'Incêndio em Edifício Comercial',
    description: 'Fumaça densa e chamas no 4º pavimento; risco de propagação.',
    severity: 'critical',
    required: { police: 0, fire: 2, medical: 1 },
    timeLimitSec: 105,
    resolveDurationSec: 18,
    reward: 11200,
    reputationPenalty: 13,
  },
  {
    code: 'COD-193-B',
    title: 'Princípio de Incêndio Residencial',
    description: 'Curto-circuito atingiu apartamento no andar térreo.',
    severity: 'high',
    required: { police: 0, fire: 1, medical: 0 },
    timeLimitSec: 95,
    resolveDurationSec: 13,
    reward: 5400,
    reputationPenalty: 8,
  },
  {
    code: 'COD-193-C',
    title: 'Vazamento de Gás em Via Pública',
    description: 'Obra rompeu tubulação de alta pressão; área precisa de isolamento.',
    severity: 'high',
    required: { police: 1, fire: 1, medical: 0 },
    timeLimitSec: 100,
    resolveDurationSec: 15,
    reward: 7800,
    reputationPenalty: 9,
  },
  {
    code: 'COD-192-A',
    title: 'Parada Cardiorrespiratória',
    description: 'Vítima inconsciente em centro empresarial; suporte avançado urgente.',
    severity: 'critical',
    required: { police: 0, fire: 0, medical: 1 },
    timeLimitSec: 80,
    resolveDurationSec: 11,
    reward: 5600,
    reputationPenalty: 10,
  },
  {
    code: 'COD-192-B',
    title: 'Queda com Trauma Grave',
    description: 'Trabalhador sofreu queda em andaime; necessita imobilização UTI.',
    severity: 'high',
    required: { police: 0, fire: 0, medical: 1 },
    timeLimitSec: 95,
    resolveDurationSec: 12,
    reward: 4700,
    reputationPenalty: 7,
  },
  {
    code: 'COD-192-C',
    title: 'Emergência Médica em Terminal',
    description: 'Passageiro com crise convulsiva aguda aguardando atendimento.',
    severity: 'moderate',
    required: { police: 0, fire: 0, medical: 1 },
    timeLimitSec: 110,
    resolveDurationSec: 10,
    reward: 3900,
    reputationPenalty: 5,
  },
  {
    code: 'COD-999-X',
    title: 'Colisão Múltipla em Cruzamento',
    description: 'Engavetamento com vítimas presas nas ferragens e derramamento de óleo.',
    severity: 'critical',
    required: { police: 1, fire: 1, medical: 1 },
    timeLimitSec: 115,
    resolveDurationSec: 20,
    reward: 13500,
    reputationPenalty: 14,
  },
];

export async function searchRealCity(query: string): Promise<CityPreset[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&limit=5&addressdetails=1`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      place_id: number;
      display_name: string;
      lat: string;
      lon: string;
      address?: {
        city?: string;
        town?: string;
        municipality?: string;
        state?: string;
        country?: string;
      };
    }>;

    return data.map((item) => {
      const cityTitle =
        item.address?.city ||
        item.address?.town ||
        item.address?.municipality ||
        item.display_name.split(',')[0];
      const regionParts = [item.address?.state, item.address?.country].filter(Boolean).join(', ');
      return {
        id: `custom-${item.place_id}`,
        name: cityTitle,
        country: item.address?.country || 'Mundo',
        subtitle: regionParts || item.display_name,
        center: { lng: parseFloat(item.lon), lat: parseFloat(item.lat) },
        zoom: 14.3,
        pitch: 55,
        bearing: -12,
        districts: ['Centro', 'Zona Norte', 'Zona Sul', 'Zona Leste', 'Zona Oeste', 'Setor Comercial'],
        radiusKm: 3.4,
      };
    });
  } catch {
    return [];
  }
}
