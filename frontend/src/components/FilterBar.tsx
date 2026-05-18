import { useState } from 'react'
import styles from './FilterBar.module.css'

export interface FiltruVertibas {
  atslegvardi: string
  cpv: string
  procedura: string
  slieksnis: number
}

export interface FilterBarProps {
  cpvVarianti: string[]
  procedurasVarianti: string[]
  onMeklet: (vertibas: FiltruVertibas) => void
}

export default function FilterBar({ cpvVarianti, procedurasVarianti, onMeklet }: FilterBarProps) {
  const [atslegvardi, setAtslegvardi] = useState('')
  const [cpv, setCpv] = useState('')
  const [procedura, setProcedura] = useState('')
  const [slieksnis, setSlieksnis] = useState(70)

  const iesniegt = (e: React.FormEvent) => {
    e.preventDefault()
    onMeklet({ atslegvardi, cpv, procedura, slieksnis })
  }

  return (
    <form className={styles.bar} onSubmit={iesniegt}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="filter-key">Meklēt ieteikumus</label>
        <div className={styles.inputWrap}>
          <svg className={styles.inputIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="#434655" strokeWidth="2" />
            <path d="M20 20l-3.5-3.5" stroke="#434655" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            id="filter-key"
            className={styles.input}
            type="text"
            placeholder="Atslēgvārdi, ID vai pasūtītāji..."
            value={atslegvardi}
            onChange={(e) => setAtslegvardi(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="filter-cpv">CPV kods</label>
        <select
          id="filter-cpv"
          className={styles.select}
          value={cpv}
          onChange={(e) => setCpv(e.target.value)}
        >
          <option value="">Visi kodi</option>
          {cpvVarianti.map((kods) => (
            <option key={kods} value={kods}>{kods}</option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="filter-procedura">Nozare</label>
        <select
          id="filter-procedura"
          className={styles.select}
          value={procedura}
          onChange={(e) => setProcedura(e.target.value)}
        >
          <option value="">Visas nozares</option>
          {procedurasVarianti.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <div className={styles.sliderHeader}>
          <span className={styles.label}>Sliekšņa interese</span>
          <span className={styles.sliderValue}>{slieksnis}%</span>
        </div>
        <input
          className={styles.slider}
          type="range"
          min={0}
          max={100}
          step={5}
          value={slieksnis}
          onChange={(e) => {
            const jaunais = Number(e.target.value)
            setSlieksnis(jaunais)
            onMeklet({ atslegvardi, cpv, procedura, slieksnis: jaunais })
          }}
        />
      </div>

      <button type="submit" className={styles.submit}>Meklēt</button>
    </form>
  )
}
