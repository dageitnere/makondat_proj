import argparse
import logging
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, cast

import pandas as pd
import requests
from filelock import FileLock
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# --- Konfigurācija ---
BASE_DIR = Path(__file__).parent
DATA_CSV = BASE_DIR / "data.csv"
CACHE_DIR = BASE_DIR / "cache"
CACHE_DIR.mkdir(exist_ok=True)

REZULTATI_DATASET_ID = "e909312a-61c9-4cde-a72a-0a09dd75ef43"
IZSLUDINATIE_DATASET_ID = "f78dd9df-25fb-4e3e-8247-1db02684819a"
CKAN_API = "https://data.gov.lv/dati/api/3/action/package_show"

CPV_KOLONNAS = ["Iepirkuma_ID", "CPV_kods_galvenais_prieksmets", "CPV_kodi_papildus_prieksmeti"]

# --- Logging ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)


def izveidot_sesiju() -> requests.Session:
    """Izveido HTTP sesiju ar automātisku retry loģiku."""
    sesija = requests.Session()
    retry = Retry(
        total=3,
        backoff_factor=2,
        status_forcelist=[429, 500, 502, 503, 504],
    )
    adapteris = HTTPAdapter(max_retries=retry)
    sesija.mount("https://", adapteris)
    sesija.mount("http://", adapteris)
    return sesija


def fetch_resource_urls(sesija: requests.Session, dataset_id: str, name_pattern: str) -> dict[int, str]:
    """Atgriež {gads: url} vārdnīcu, vaicājot CKAN API."""
    atbilde = sesija.get(CKAN_API, params={"id": dataset_id}, timeout=30)
    atbilde.raise_for_status()
    resursi = atbilde.json()["result"]["resources"]

    urls: dict[int, str] = {}
    for r in resursi:
        sakritiba = re.search(name_pattern, r["name"], re.IGNORECASE)
        if sakritiba:
            urls[int(sakritiba.group(1))] = r["url"]

    if not urls:
        raise RuntimeError(f"Nav atrasti resursi ar šablonu '{name_pattern}' datasetā '{dataset_id}'")
    return urls


def lejupieladet_uz_kesi(sesija: requests.Session, url: str, kesa_cels: Path) -> None:
    """Lejupielādē CSV failu uz kešu."""
    log.info("Lejupielādē: %s ...", kesa_cels.name)
    atbilde = sesija.get(url, timeout=120)
    atbilde.raise_for_status()
    kesa_cels.write_bytes(atbilde.content)


def lasit_csv(avots: Path, **kwargs: Any) -> pd.DataFrame:
    """Lasa CSV, mēģinot utf-8, tad cp1257."""
    try:
        return cast(pd.DataFrame, pd.read_csv(avots, encoding="utf-8", **kwargs))
    except UnicodeDecodeError:
        return cast(pd.DataFrame, pd.read_csv(avots, encoding="cp1257", **kwargs))


def ieladet_izsludinatie_cpv(
    sesija: requests.Session,
    izsludinatie_urls: dict[int, str],
    gads: int,
    piespiedu_atjauninasana: bool = False,
) -> pd.DataFrame:
    """Ielādē CPV kolonnas no visiem izsludinātie CSV, atgriež 1 ierakstu uz ID."""
    kadri: list[pd.DataFrame] = []

    for faila_gads, url in sorted(izsludinatie_urls.items()):
        kesa_cels = CACHE_DIR / f"izsludinatie_{faila_gads}.csv"
        vajag_lejupieladet = (
            not kesa_cels.exists()
            or faila_gads == gads
            or piespiedu_atjauninasana
        )
        if vajag_lejupieladet:
            lejupieladet_uz_kesi(sesija, url, kesa_cels)
        else:
            log.info("Keša fails: %s", kesa_cels.name)

        df = lasit_csv(kesa_cels, low_memory=False, on_bad_lines="skip")
        pieejamas = [k for k in CPV_KOLONNAS if k in df.columns]
        if pieejamas:
            kadri.append(df[pieejamas])

    if not kadri:
        raise RuntimeError("Neviens izsludinātie fails nesatur CPV kolonnas")

    cpv = pd.concat(kadri, ignore_index=True)
    cpv["Iepirkuma_ID"] = cpv["Iepirkuma_ID"].astype(str).str.strip()
    cpv = cpv.drop_duplicates(subset=["Iepirkuma_ID"], keep="last")
    return cpv


def main(gads: int, piespiedu_atjauninasana: bool = False) -> None:
    log.info("=== data.csv atjaunošana (gads: %d) ===", gads)

    # 1. HTTP sesija ar retry
    sesija = izveidot_sesiju()

    # 2. Iegūst URL no CKAN API
    log.info("Vaicā CKAN API ...")
    rezultati_urls = fetch_resource_urls(sesija, REZULTATI_DATASET_ID, r"rezultati_(\d{4})\.csv")
    izsludinatie_urls = fetch_resource_urls(sesija, IZSLUDINATIE_DATASET_ID, r"izsludinatie_(\d{4})\.csv")
    log.info("Rezultāti gadi: %s", sorted(rezultati_urls))
    log.info("Izsludinātie gadi: %s", sorted(izsludinatie_urls))

    # 3. Lejupielādē rezultāti CSV uz kešu, tad lasa lokāli
    if gads not in rezultati_urls:
        log.error("Rezultāti %d nav atrasti API atbildē", gads)
        sys.exit(1)

    rezultati_kess = CACHE_DIR / f"rezultati_{gads}.csv"
    lejupieladet_uz_kesi(sesija, rezultati_urls[gads], rezultati_kess)
    rezultati = lasit_csv(rezultati_kess, low_memory=False)
    rezultati["Iepirkuma_ID"] = rezultati["Iepirkuma_ID"].astype(str).str.strip()

    # 4. Ielādē CPV uzmeklēšanas tabulu
    log.info("Ielādē izsludinātie CPV datus ...")
    cpv = ieladet_izsludinatie_cpv(sesija, izsludinatie_urls, gads, piespiedu_atjauninasana)
    log.info("CPV tabula: %d unikāli ID", len(cpv))

    # 5. Faila bloķēšana — tikai data.csv lasīšanai un rakstīšanai
    bloks = FileLock(str(DATA_CSV) + ".lock")
    with bloks:
        # 6. Pārbaudīt data.csv esamību
        if not DATA_CSV.exists():
            log.error("data.csv nav atrasts: %s", DATA_CSV)
            sys.exit(1)

        # 7. Nolasa esošos ID-us
        esosie = pd.read_csv(DATA_CSV, usecols=["Iepirkuma_ID"], encoding="utf-8")
        esosie_id = set(esosie["Iepirkuma_ID"].astype(str).str.strip())
        log.info("Esošie ieraksti: %d unikāli ID", len(esosie_id))

        # 8. Filtrē tikai jaunos ierakstus
        jaunie = rezultati[~rezultati["Iepirkuma_ID"].isin(esosie_id)].copy()
        log.info("Jaunie ieraksti: %d rindas (%d unikāli ID)", len(jaunie), jaunie["Iepirkuma_ID"].nunique())

        if jaunie.empty:
            log.info("Nav jaunu ierakstu. data.csv ir aktuāls.")
            return

        # 9. LEFT JOIN — CPV kolonnas pievienotas kur atrodams sakrītošs ID
        cpv_nonem = [k for k in ["CPV_kods_galvenais_prieksmets", "CPV_kodi_papildus_prieksmeti"] if k in jaunie.columns]
        jaunie = jaunie.drop(columns=cpv_nonem)
        jaunie = jaunie.merge(cpv, on="Iepirkuma_ID", how="left")

        # 10. Pielāgo kolonnu secību pēc data.csv galvenes
        kolonnas = list(pd.read_csv(DATA_CSV, encoding="utf-8", nrows=0).columns)
        jaunie = jaunie.reindex(columns=kolonnas)

        # 11. Append bez galvenes
        jaunie.to_csv(DATA_CSV, mode="a", index=False, header=False, encoding="utf-8")
        log.info("Pievienotas %d jaunas rindas pie data.csv.", len(jaunie))
        log.info("Gatavs.")


if __name__ == "__main__":
    parsetajs = argparse.ArgumentParser(description="Atjauno data.csv ar jaunākajiem EIS iepirkumu datiem.")
    parsetajs.add_argument(
        "--gads",
        type=int,
        default=datetime.now().year,
        help="Rezultātu gads (noklusējums: kārtējais gads)",
    )
    parsetajs.add_argument(
        "--force-refresh",
        action="store_true",
        help="Piespiedu keša atjaunināšana visiem gadiem",
    )
    argumenti = parsetajs.parse_args()

    try:
        main(gads=argumenti.gads, piespiedu_atjauninasana=argumenti.force_refresh)
    except Exception as kludas_zinojums:
        log.error("Skripts apstājās ar kļūdu: %s", kludas_zinojums)
        sys.exit(1)
