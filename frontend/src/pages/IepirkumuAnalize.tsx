import { useEffect, useMemo, useState } from 'react'
import TopNavBar from '../components/TopNavBar'
import PageHeader from '../components/PageHeader'
import FilterBar, { type FiltruVertibas } from '../components/FilterBar'
import RecommendationsTable, { type TabulasRinda } from '../components/RecommendationsTable'
import IepirkumaPanelis from '../components/IepirkumaPanelis'
import { api } from '../api'
import type { Iepirkums, PrognozeRezultats } from '../types'
import styles from './IepirkumuAnalize.module.css'

const LAPAS_LIELUMS = 10

// Deterministisks vietturis "interesei", kamēr backend /prognoze nav salabots.
// Hešo iepirkuma ID, lai katra rinda iegūst stabilu 0..100 vērtību.
function placeholderInterese(id: string | number): number {
  const s = String(id)
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h % 101
}

export default function IepirkumuAnalize() {
  const [filtri, setFiltri] = useState<FiltruVertibas>({ atslegvardi: '', cpv: '', procedura: '', slieksnis: 0 })
  const [nobide, setNobide] = useState(0)
  const [dati, setDati] = useState<Iepirkums[]>([])
  const [kopskaits, setKopskaits] = useState(0)
  const [cpvVarianti, setCpvVarianti] = useState<string[]>([])
  const [procedurasVarianti, setProcedurasVarianti] = useState<string[]>([])
  const [kluda, setKluda] = useState<string | null>(null)
  const [ielade, setIelade] = useState(true)
  const [saglabatie, setSaglabatie] = useState<Set<string>>(new Set())
  const [aktivaisId, setAktivaisId] = useState<string | null>(null)
  const [atjauninaDatus, setAtjauninaDatus] = useState(false)
  const [atjauninasanasStatuss, setAtjauninasanasStatuss] = useState<
    { veids: 'info' | 'kluda'; teksts: string } | null
  >(null)
  const [piegadatajs, setPiegadatajs] = useState('')
  const [prognozeRezultats, setPrognozeRezultats] = useState<PrognozeRezultats | null>(null)
  const [analizeDarbojas, setAnalizeDarbojas] = useState(false)
  const [analizesKluda, setAnalizesKluda] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.cpvSaraksts(50), api.proceduras()])
      .then(([cpv, p]) => {
        setCpvVarianti(cpv.cpv_codes)
        setProcedurasVarianti(p.procedures)
      })
      .catch(() => {
        // klusi — filtru izvēlnes paliks tukšas
      })
  }, [])

  useEffect(() => {
    if (prognozeRezultats) return
    setIelade(true)
    setKluda(null)
    api
      .filtret({
        key: filtri.atslegvardi,
        cpv_kods: filtri.cpv,
        procedura: filtri.procedura,
        offset: nobide,
        limit: LAPAS_LIELUMS,
      })
      .then((res) => {
        setDati(res.data)
        setKopskaits(res.total)
      })
      .catch((e: Error) => setKluda(e.message))
      .finally(() => setIelade(false))
  }, [filtri, nobide, prognozeRezultats])

  const visasPrognozeRindas: TabulasRinda[] = useMemo(() => {
    if (!prognozeRezultats) return []
    return prognozeRezultats.prognozes
      .map((p) => ({ iepirkums: p as Iepirkums, interese: p.varbatiba }))
      .filter((r) => r.interese >= filtri.slieksnis)
  }, [prognozeRezultats, filtri.slieksnis])

  const rindas: TabulasRinda[] = useMemo(() => {
    if (prognozeRezultats) {
      return visasPrognozeRindas.slice(nobide, nobide + LAPAS_LIELUMS)
    }
    return dati
      .map((iepirkums) => ({
        iepirkums,
        interese: placeholderInterese(iepirkums.Iepirkuma_ID),
      }))
      .filter((r) => r.interese >= filtri.slieksnis)
  }, [dati, prognozeRezultats, visasPrognozeRindas, nobide, filtri.slieksnis])

  const mekletKlikski = (vertibas: FiltruVertibas) => {
    setFiltri(vertibas)
    setNobide(0)
  }

  const saglabatKlikski = async (id: string) => {
    try {
      await api.saglabat(id)
      setSaglabatie((prev) => new Set(prev).add(id))
    } catch (e) {
      console.error('Saglabāt failed', e)
    }
  }

  const atvertKlikski = (id: string) => {
    setAktivaisId(id)
  }

  const analizetKlikski = async () => {
    if (!piegadatajs.trim()) return
    setAnalizeDarbojas(true)
    setAnalizesKluda(null)
    setPrognozeRezultats(null)
    setNobide(0)
    try {
      const rezultats = await api.prognoze(piegadatajs.trim())
      setPrognozeRezultats(rezultats)
      setNobide(0)
    } catch (e) {
      setAnalizesKluda((e as Error).message)
    } finally {
      setAnalizeDarbojas(false)
    }
  }

  const notirit = () => {
    setPrognozeRezultats(null)
    setAnalizesKluda(null)
  }

  const aizvertPaneli = () => {
    setAktivaisId(null)
  }

  const atjaunotDatusKlikski = async () => {
    setAtjauninaDatus(true)
    setAtjauninasanasStatuss(null)
    try {
      const rezultats = await api.atjaunotDatus()
      const n = rezultats.pievienotas_rindas
      setAtjauninasanasStatuss({
        veids: 'info',
        teksts:
          n === 0
            ? 'Nav jaunu iepirkumu.'
            : `Pievienoti ${n} jauni iepirkumi.`,
      })
    } catch (e) {
      setAtjauninasanasStatuss({
        veids: 'kluda',
        teksts: `Atjaunināšana neizdevās: ${(e as Error).message}`,
      })
    } finally {
      setAtjauninaDatus(false)
    }
  }

  return (
    <>
      <TopNavBar />
      <main className={styles.page}>
        <div className={styles.canvas}>
          <PageHeader
            virsraksts="Iepirkumu analīze"
            apraksts="Mašīnmācīšanās analīze, kas balstīta uz jūsu vēsturiskajiem datiem un nozari."
            papildusPogasUzraksts={atjauninaDatus ? 'Atjaunina...' : 'Atjaunot datus'}
            onPapildusPoga={atjaunotDatusKlikski}
            papildusPogasAtspejota={atjauninaDatus}
          />

          {atjauninasanasStatuss && (
            <div
              className={`${styles.atjauninasanasStatuss} ${
                atjauninasanasStatuss.veids === 'kluda' ? styles.atjauninasanasKluda : ''
              }`}
            >
              {atjauninasanasStatuss.teksts}
            </div>
          )}

          <div className={styles.analize}>
            <div className={styles.analizeIeeja}>
              <input
                className={styles.analizeInput}
                type="text"
                placeholder="Piegādātāja reģistrācijas nr. (piemēram 40003575567)"
                value={piegadatajs}
                onChange={(e) => setPiegadatajs(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && analizetKlikski()}
                disabled={analizeDarbojas}
              />
              <button
                className={styles.analizeBtn}
                onClick={analizetKlikski}
                disabled={analizeDarbojas || !piegadatajs.trim()}
              >
                {analizeDarbojas ? 'Analizē...' : 'Analizēt'}
              </button>
              {prognozeRezultats && (
                <button className={styles.notirit} onClick={notirit}>
                  Notīrīt
                </button>
              )}
            </div>

            {analizesKluda && (
              <div className={styles.analizesKluda}>{analizesKluda}</div>
            )}

            {prognozeRezultats && (
              <div className={styles.analizesInfo}>
                Analīze aktīva — {prognozeRezultats.uzvaras_skaits} vēsturiski uzvarēti iepirkumi.
                Rāda {visasPrognozeRindas.length} ieteikumus (no {prognozeRezultats.prognozes.length} kopā).
              </div>
            )}
          </div>

          <FilterBar
            cpvVarianti={cpvVarianti}
            procedurasVarianti={procedurasVarianti}
            onMeklet={mekletKlikski}
          />

          {kluda && (
            <div className={styles.error}>
              Kļūda: {kluda}. Pārliecinieties, ka backend darbojas uz portu 8000.
            </div>
          )}

          {ielade ? (
            <div className={styles.loading}>Ielādē...</div>
          ) : (
            <RecommendationsTable
              rindas={rindas}
              kopskaits={prognozeRezultats ? visasPrognozeRindas.length : kopskaits}
              nobide={nobide}
              limits={LAPAS_LIELUMS}
              onAtpakal={() => setNobide((n) => Math.max(0, n - LAPAS_LIELUMS))}
              onUzPrieksu={() => setNobide((n) => n + LAPAS_LIELUMS)}
              onSaglabat={saglabatKlikski}
              onAtvert={atvertKlikski}
            />
          )}

          {saglabatie.size > 0 && (
            <div className={styles.savedHint}>{saglabatie.size} saglabāts šajā sesijā</div>
          )}
        </div>
      </main>

      <IepirkumaPanelis
        iepirkumaId={aktivaisId}
        onAizvert={aizvertPaneli}
        onSaglabat={saglabatKlikski}
        ieladetsIepirkums={
          prognozeRezultats && aktivaisId
            ? (prognozeRezultats.prognozes.find(
                (p) => String(p.Iepirkuma_ID) === aktivaisId
              ) ?? null)
            : null
        }
      />
    </>
  )
}
