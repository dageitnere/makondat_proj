import styles from './PageHeader.module.css'

export interface PageHeaderProps {
  virsraksts: string
  apraksts?: string
  darbibasUzraksts?: string
  onDarbiba?: () => void
  papildusPogasUzraksts?: string
  onPapildusPoga?: () => void
  papildusPogasAtspejota?: boolean
}

export default function PageHeader({
  virsraksts,
  apraksts,
  darbibasUzraksts,
  onDarbiba,
  papildusPogasUzraksts,
  onPapildusPoga,
  papildusPogasAtspejota,
}: PageHeaderProps) {
  return (
    <section className={styles.header}>
      <div className={styles.text}>
        <h2 className={styles.title}>{virsraksts}</h2>
        {apraksts && <p className={styles.subtitle}>{apraksts}</p>}
      </div>
      {(papildusPogasUzraksts || darbibasUzraksts) && (
        <div className={styles.actions}>
          {papildusPogasUzraksts && (
            <button
              type="button"
              className={styles.action}
              onClick={onPapildusPoga}
              disabled={papildusPogasAtspejota}
            >
              <span>{papildusPogasUzraksts}</span>
            </button>
          )}
          {darbibasUzraksts && (
            <button type="button" className={styles.action} onClick={onDarbiba}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              <span>{darbibasUzraksts}</span>
            </button>
          )}
        </div>
      )}
    </section>
  )
}
