import styles from './TopNavBar.module.css'

export default function TopNavBar() {
  return (
    <header className={styles.bar}>
      <div className={styles.left}>
        <div className={styles.brand}>
          <h1 className={styles.logo}>EIS Analīze</h1>
        </div>
      </div>
    </header>
  )
}
