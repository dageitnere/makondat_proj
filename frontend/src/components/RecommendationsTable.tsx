import styles from './RecommendationsTable.module.css'
import type { Iepirkums } from '../types'

export interface TabulasRinda {
  iepirkums: Iepirkums
  /** 0..100 — krāso progresa joslu un noteic procentu tekstu */
  interese: number
}

export interface RecommendationsTableProps {
  rindas: TabulasRinda[]
  kopskaits: number
  nobide: number
  limits: number
  onAtpakal: () => void
  onUzPrieksu: () => void
  onSaglabat: (id: string) => void
  onAtvert: (id: string) => void
}

function interesesTonis(p: number): 'success' | 'warning' | 'danger' {
  if (p >= 70) return 'success'
  if (p >= 40) return 'warning'
  return 'danger'
}

export default function RecommendationsTable({
  rindas,
  kopskaits,
  nobide,
  limits,
  onAtpakal,
  onUzPrieksu,
  onSaglabat,
  onAtvert,
}: RecommendationsTableProps) {
  const no = kopskaits === 0 ? 0 : nobide + 1
  const lidz = Math.min(nobide + limits, kopskaits)
  const varAtpakal = nobide > 0
  const varUzPrieksu = nobide + limits < kopskaits

  return (
    <section className={styles.card}>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={`${styles.th} ${styles.colId}`}>ID</th>
              <th className={`${styles.th} ${styles.colTitle}`}>Iepirkums</th>
              <th className={`${styles.th} ${styles.colCustomer}`}>Pasūtītājs</th>
              <th className={`${styles.th} ${styles.colSum}`}>Summa</th>
              <th className={`${styles.th} ${styles.colInterest}`}>Interese</th>
              <th className={`${styles.th} ${styles.colActions}`}></th>
            </tr>
          </thead>
          <tbody>
            {rindas.length === 0 ? (
              <tr>
                <td className={styles.empty} colSpan={6}>Nav rezultātu pēc filtra.</td>
              </tr>
            ) : (
              rindas.map(({ iepirkums: it, interese }, i) => {
                const tonis = interesesTonis(interese)
                return (
                  <tr
                    key={`${it.Iepirkuma_ID}-${i}`}
                    className={i % 2 === 1 ? styles.rowAlt : undefined}
                  >
                    <td className={styles.cell}>
                      <span className={styles.idBadge}>{it.Iepirkuma_ID}</span>
                    </td>
                    <td className={styles.cell}>
                      <button className={styles.link} onClick={() => onAtvert(String(it.Iepirkuma_ID))}>
                        {it.Iepirkuma_nosaukums || '—'}
                      </button>
                    </td>
                    <td className={styles.cellMuted}>{it.Pasutitaja_nosaukums || '—'}</td>
                    <td className={styles.cellMuted}>{formatetSummu(it.Aktuala_liguma_summa, it.Aktuala_liguma_summas_valuta)}</td>
                    <td className={styles.cell}>
                      <div className={styles.interest}>
                        <div className={styles.progressTrack}>
                          <div
                            className={`${styles.progressFill} ${styles[`tone_${tonis}`]}`}
                            style={{ width: `${Math.max(0, Math.min(100, interese))}%` }}
                          />
                        </div>
                        <span className={`${styles.interestText} ${styles[`text_${tonis}`]}`}>
                          {Math.round(interese)}%
                        </span>
                      </div>
                    </td>
                    <td className={styles.cell}>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          aria-label="Saglabāt"
                          title="Saglabāt"
                          onClick={() => onSaglabat(String(it.Iepirkuma_ID))}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M6 4h12v16l-6-4-6 4V4z" stroke="#434655" strokeWidth="1.6" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          aria-label="Atvērt"
                          title="Atvērt"
                          onClick={() => onAtvert(String(it.Iepirkuma_ID))}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M5 12h14M13 6l6 6-6 6" stroke="#434655" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.footer}>
        <span className={styles.footerText}>
          Rāda {no}–{lidz} no {kopskaits}
        </span>
        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={onAtpakal}
            disabled={!varAtpakal}
            aria-label="Iepriekšējā lapa"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" stroke="#434655" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={onUzPrieksu}
            disabled={!varUzPrieksu}
            aria-label="Nākamā lapa"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 6l6 6-6 6" stroke="#434655" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  )
}

function formatetSummu(summa: string | number | undefined, valuta: string | undefined): string {
  if (summa === '' || summa === undefined || summa === null) return '—'
  const n = typeof summa === 'number' ? summa : Number(summa)
  if (!Number.isFinite(n)) return String(summa)
  return `${n.toLocaleString('lv-LV', { maximumFractionDigits: 0 })} ${valuta || 'EUR'}`
}
