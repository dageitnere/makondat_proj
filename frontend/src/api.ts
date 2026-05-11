import type {
  FiltruParametri,
  FiltruRezultats,
  Iepirkums,
  Statistika,
} from './types'

const BASE = '/api'

type QueryParams = Record<string, string | number | undefined>

async function get<T>(path: string, params?: QueryParams): Promise<T> {
  const url = new URL(BASE + path, window.location.origin)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v))
    }
  }
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

export const api = {
  iepirkumi: (limit = 20) => get<Iepirkums[]>('/iepirkumi', { limit }),
  filtret: (p: FiltruParametri) =>
    get<FiltruRezultats>('/filtri', p as QueryParams),
  viensIepirkums: (id: string) => get<Iepirkums>(`/iepirkums/${encodeURIComponent(id)}`),
  statistika: () => get<Statistika>('/statistika'),
  proceduras: () => get<{ procedures: string[] }>('/proceduras'),
  cpvSaraksts: (limit = 100) => get<{ cpv_codes: string[] }>('/cpv_saraksts', { limit }),
  topPasititaji: (limit = 10) => get<{ top_customers: Record<string, number> }>('/top_pasititaji', { limit }),
  topUzvaretaji: (limit = 10) => get<{ top_winners: Record<string, number> }>('/top_uzvaretaji', { limit }),
  topSummas: (limit = 10) => get<Iepirkums[]>('/top_summas', { limit }),
  saglabatie: () => get<Iepirkums[]>('/saglabatie'),
  saglabat: async (id: string) => {
    const res = await fetch(`${BASE}/saglabat/${encodeURIComponent(id)}`, { method: 'POST' })
    if (!res.ok) throw new Error(`${res.status}`)
    return res.json()
  },
  dzestSaglabato: async (id: string) => {
    const res = await fetch(`${BASE}/saglabat/${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`${res.status}`)
    return res.json()
  },
}
