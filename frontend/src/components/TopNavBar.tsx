import styles from './TopNavBar.module.css'

export interface TopNavBarProps {
  vards?: string
  loma?: string
}

export default function TopNavBar({ vards = 'John Doe', loma = 'Lietotājs' }: TopNavBarProps) {
  const iniciali = vards.split(' ').map((d) => d[0]).join('').slice(0, 2).toUpperCase()

  return (
    <header className={styles.bar}>
      <div className={styles.left}>
        <div className={styles.brand}>
          <h1 className={styles.logo}>EIS Analīze</h1>
        </div>
        <nav className={styles.nav}>
          <a className={styles.link} href="#">Pārskats</a>
          <a className={`${styles.link} ${styles.linkActive}`} href="#">Iepirkumu analīze</a>
          <a className={styles.link} href="#">Saglabātie</a>
        </nav>
      </div>

      <div className={styles.right}>
        <label className={styles.search}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="#6B7280" strokeWidth="2" />
            <path d="M20 20l-3.5-3.5" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input className={styles.searchInput} type="text" placeholder="Meklēt..." />
        </label>
        <div className={styles.divider} />
        <div className={styles.user}>
          <div className={styles.userText}>
            <div className={styles.userName}>{vards}</div>
            <div className={styles.userMeta}>{loma}</div>
          </div>
          <div className={styles.avatar} aria-hidden="true">
            {iniciali}
          </div>
        </div>
      </div>
    </header>
  )
}
