// Shape of one procurement row from backend/data.csv.
// All fields are strings or empty strings because the backend fills NaN with "".
// Numeric-looking fields (sums, IDs) are still returned as strings by FastAPI here.
export interface Iepirkums {
  Iepirkuma_ID: string
  Iepirkuma_nosaukums: string
  Iepirkuma_identifikacijas_numurs: string
  Pasutitaja_nosaukums: string
  Pasutitaja_registracijas_numurs: string
  Pasutitaja_registracijas_numura_veids: string
  Pasutitaja_PVS_ID: string | number
  Augstak_stavosa_organizacija: string
  Iepirkuma_statuss: string
  Regulejosais_tiesibu_akts: string
  Proceduras_veids: string
  Hipersaite_EIS_kura_pieejams_zinojums: string
  Hipersaite_uz_IUB_publikaciju: string
  Ir_dalijums_dalas: string
  Iepirkuma_dalas_nr: string | number
  Iepirkuma_dalas_nosaukums: string
  Iepirkuma_dalas_statuss: string
  Uzvaretaja_nosaukums: string
  Uzvaretaja_registracijas_numurs: string
  Uzvaretaja_registracijas_numura_veids: string
  Uzvaretaja_valsts: string
  Liguma_dok_veids: string
  Noslegta_liguma_dok_ID: string | number
  Saistita_liguma_ID: string | number
  Aktuala_liguma_summa: string | number
  Aktuala_liguma_summas_valuta: string
  Sakotneja_liguma_summa: string | number
  Sakotneja_liguma_summas_valuta: string
  Liguma_izpildes_termins: string
  Liguma_izpilde_no: string
  Liguma_izpilde_lidz: string
  Ligums_ir_vispariga_vienosanas: string
  Liguma_dok_noslegsanas_datums: string
  Liguma_dok_publicesanas_datums: string
  Izbeigsanas_datums: string
  Izbeigsanas_iemesls: string
  CPV_kods_galvenais_prieksmets: string | number
  CPV_kodi_papildus_prieksmeti: string
}

export interface FiltruRezultats {
  total: number
  limit: number
  offset: number
  data: Iepirkums[]
}

export interface Statistika {
  total_procurements: number
  average_contract_amount: number
  max_contract_amount: number
  min_contract_amount: number
}

export interface PrognozeRinda extends Iepirkums {
  varbatiba: number
}

export interface PrognozeRezultats {
  piegadatajs: string
  uzvaras_skaits: number
  prognozes: PrognozeRinda[]
}

export interface FiltruParametri {
  key?: string
  cpv_kods?: string
  procedura?: string
  sortet_pec?: string
  seciba?: 'asc' | 'desc'
  offset?: number
  limit?: number
}
