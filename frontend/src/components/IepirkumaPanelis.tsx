import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Iepirkums } from '../types'
import styles from './IepirkumaPanelis.module.css'

export interface IepirkumaPanelisProps {
  iepirkumaId: string | null
  onAizvert: () => void
  onSaglabat: (id: string) => void
  ieladetsIepirkums?: Iepirkums | null
}

export default function IepirkumaPanelis({ iepirkumaId, onAizvert, onSaglabat, ieladetsIepirkums }: IepirkumaPanelisProps) {
  const [iepirkums, setIepirkums] = useState<Iepirkums | null>(null)
  const [ielade, setIelade] = useState(false)
  const [kluda, setKluda] = useState<string | null>(null)

  useEffect(() => {
    if (!iepirkumaId) return
    // Ja dati jau ir nodoti — lieto tos, nevis ielādē no API
    if (ieladetsIepirkums) {
      setIepirkums(ieladetsIepirkums)
      return
    }
    setIelade(true)
    setKluda(null)
    setIepirkums(null)
    api
      .viensIepirkums(iepirkumaId)
      .then((it) => setIepirkums(it))
      .catch((e: Error) => setKluda(e.message))
      .finally(() => setIelade(false))
  }, [iepirkumaId, ieladetsIepirkums])

  // Esc aizver paneli
  useEffect(() => {
    if (!iepirkumaId) return
    const apdarinatajs = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onAizvert()
    }
    window.addEventListener('keydown', apdarinatajs)
    return () => window.removeEventListener('keydown', apdarinatajs)
  }, [iepirkumaId, onAizvert])

  const atverts = iepirkumaId !== null

  return (
    <>
      <div
        className={`${styles.backdrop} ${atverts ? styles.backdropOpen : ''}`}
        onClick={onAizvert}
        aria-hidden={!atverts}
      />
      <aside
        className={`${styles.panel} ${atverts ? styles.panelOpen : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Iepirkuma detaļas"
      >
        <header className={styles.header}>
          <span className={styles.eyebrow}>Iepirkums</span>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onAizvert}
            aria-label="Aizvērt"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="#434655" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className={styles.scroll}>
          {ielade && <div className={styles.stavoklis}>Ielādē...</div>}
          {kluda && <div className={`${styles.stavoklis} ${styles.kluda}`}>Kļūda: {kluda}</div>}
          {iepirkums && <IepirkumaSaturs iepirkums={iepirkums} onSaglabat={onSaglabat} />}
        </div>
      </aside>
    </>
  )
}

function IepirkumaSaturs({
  iepirkums,
  onSaglabat,
}: {
  iepirkums: Iepirkums
  onSaglabat: (id: string) => void
}) {
  const id = String(iepirkums.Iepirkuma_ID)
  const eisLink = iepirkums.Hipersaite_EIS_kura_pieejams_zinojums

  return (
    <>
      <section className={styles.titleBlock}>
        {iepirkums.Iepirkuma_statuss && (
          <span className={styles.statusBadge}>{iepirkums.Iepirkuma_statuss}</span>
        )}
        <h2 className={styles.title}>{iepirkums.Iepirkuma_nosaukums || '—'}</h2>
        <div className={styles.idStrip}>
          <span className={styles.idBadge}>{id}</span>
          {iepirkums.Iepirkuma_identifikacijas_numurs && (
            <span className={styles.idMeta}>
              {iepirkums.Iepirkuma_identifikacijas_numurs}
            </span>
          )}
        </div>
      </section>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={() => onSaglabat(id)}
        >
          Saglabāt
        </button>
        {eisLink && (
          <a className={styles.secondaryBtn} href={eisLink} target="_blank" rel="noreferrer">
            Atvērt EIS
          </a>
        )}
      </div>

      <Sadala virsraksts="Pasūtītājs">
        <Lauks uzraksts="Nosaukums" vertiba={iepirkums.Pasutitaja_nosaukums} />
        <Lauks uzraksts="Reģistrācijas Nr." vertiba={iepirkums.Pasutitaja_registracijas_numurs} />
        {iepirkums.Augstak_stavosa_organizacija && (
          <Lauks uzraksts="Augstākstāvošā" vertiba={iepirkums.Augstak_stavosa_organizacija} />
        )}
      </Sadala>

      <Sadala virsraksts="Uzvarētājs">
        <Lauks uzraksts="Nosaukums" vertiba={iepirkums.Uzvaretaja_nosaukums} />
        <Lauks uzraksts="Reģistrācijas Nr." vertiba={iepirkums.Uzvaretaja_registracijas_numurs} />
        <Lauks uzraksts="Valsts" vertiba={iepirkums.Uzvaretaja_valsts} />
      </Sadala>

      <Sadala virsraksts="Līgums">
        <Lauks
          uzraksts="Aktuālā summa"
          vertiba={formatetSummu(iepirkums.Aktuala_liguma_summa, iepirkums.Aktuala_liguma_summas_valuta)}
        />
        {iepirkums.Sakotneja_liguma_summa !== '' && (
          <Lauks
            uzraksts="Sākotnējā summa"
            vertiba={formatetSummu(iepirkums.Sakotneja_liguma_summa, iepirkums.Sakotneja_liguma_summas_valuta)}
          />
        )}
        <Lauks uzraksts="Noslēgts" vertiba={iepirkums.Liguma_dok_noslegsanas_datums} />
        <Lauks uzraksts="Publicēts" vertiba={iepirkums.Liguma_dok_publicesanas_datums} />
        <Lauks
          uzraksts="Izpildes periods"
          vertiba={
            iepirkums.Liguma_izpilde_no || iepirkums.Liguma_izpilde_lidz
              ? `${iepirkums.Liguma_izpilde_no || '—'} → ${iepirkums.Liguma_izpilde_lidz || '—'}`
              : iepirkums.Liguma_izpildes_termins
          }
        />
      </Sadala>

      <Sadala virsraksts="Procedūra">
        <Lauks uzraksts="Veids" vertiba={iepirkums.Proceduras_veids} />
        <Lauks uzraksts="Tiesību akts" vertiba={iepirkums.Regulejosais_tiesibu_akts} />
        <Lauks uzraksts="CPV (galvenais)" vertiba={iepirkums.CPV_kods_galvenais_prieksmets} />
        {iepirkums.CPV_kodi_papildus_prieksmeti && (
          <Lauks uzraksts="CPV (papildus)" vertiba={iepirkums.CPV_kodi_papildus_prieksmeti} />
        )}
      </Sadala>

      {iepirkums.Iepirkuma_dalas_nosaukums && (
        <Sadala virsraksts="Daļa">
          <Lauks
            uzraksts={`Daļa Nr. ${iepirkums.Iepirkuma_dalas_nr ?? '—'}`}
            vertiba={iepirkums.Iepirkuma_dalas_nosaukums}
          />
          <Lauks uzraksts="Statuss" vertiba={iepirkums.Iepirkuma_dalas_statuss} />
        </Sadala>
      )}
    </>
  )
}

function Sadala({ virsraksts, children }: { virsraksts: string; children: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>{virsraksts}</h3>
      <dl className={styles.fields}>{children}</dl>
    </section>
  )
}

function Lauks({ uzraksts, vertiba }: { uzraksts: string; vertiba: string | number | undefined | null }) {
  const teksts = vertiba === '' || vertiba === undefined || vertiba === null ? '—' : String(vertiba)
  return (
    <div className={styles.field}>
      <dt className={styles.fieldLabel}>{uzraksts}</dt>
      <dd className={styles.fieldValue}>{teksts}</dd>
    </div>
  )
}

function formatetSummu(summa: string | number | undefined, valuta: string | undefined): string {
  if (summa === '' || summa === undefined || summa === null) return '—'
  const n = typeof summa === 'number' ? summa : Number(summa)
  if (!Number.isFinite(n)) return String(summa)
  return `${n.toLocaleString('lv-LV', { maximumFractionDigits: 0 })} ${valuta || 'EUR'}`
}
