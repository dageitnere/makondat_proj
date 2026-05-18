from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from xgboost import XGBClassifier

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

dati = pd.read_csv("data.csv")
dati = dati.fillna("")
saglabati_iepirkumi: list[str] = []

FEATURES = [
    "Iepirkuma_nosaukums",
    "Pasutitaja_nosaukums",
    "Proceduras_veids",
    "CPV_kods_galvenais_prieksmets",
    "CPV_kodi_papildus_prieksmeti",
    "Iepirkuma_statuss",
    "Ir_dalijums_dalas",
]
MIN_UZVARAS = 5
NOSLEGTI_STATUSI = {"Līgums noslēgts", "Noslēgts", "Pārtraukts", "Izbeigts"}
CACHE_DIR = Path("cache")


# ---------------------------------------------------------------------------
# Modeļi
# ---------------------------------------------------------------------------

class PrognozesIeeja(BaseModel):
    piegadatajs_regs_nr: str


# ---------------------------------------------------------------------------
# Endpointi
# ---------------------------------------------------------------------------

@app.get("/")
def home():
    return {"message": "Backend works"}


@app.get("/iepirkumi", tags=["Procurements"])
def get_iepirkumi(limit: int = 20):
    return dati.head(limit).to_dict(orient="records")


@app.get("/filtri", tags=["Procurements"])
def filtret_iepirkumus(
    key: str = "",
    cpv_kods: str = "",
    procedura: str = "",
    sortet_pec: str = "",
    offset: int = 0,
    seciba: str = "asc",
    limit: int = 20,
):
    filtreti_dati = dati

    if key:
        filtreti_dati = filtreti_dati[
            filtreti_dati["Iepirkuma_nosaukums"].str.contains(key, case=False, na=False)
        ]

    if cpv_kods:
        filtreti_dati = filtreti_dati[
            filtreti_dati["CPV_kods_galvenais_prieksmets"]
            .astype(str)
            .str.contains(cpv_kods, case=False, na=False)
        ]

    if procedura:
        filtreti_dati = filtreti_dati[
            filtreti_dati["Proceduras_veids"].str.contains(procedura, case=False, na=False)
        ]

    if sortet_pec:
        try:
            filtreti_dati = filtreti_dati.sort_values(
                by=sortet_pec, ascending=(seciba != "desc")
            )
        except Exception:
            pass

    rezultats = filtreti_dati.iloc[offset : offset + limit]
    return {
        "total": len(filtreti_dati),
        "limit": limit,
        "offset": offset,
        "data": rezultats.to_dict(orient="records"),
    }


@app.get("/iepirkums/{iepirkuma_id}")
def iegut_vienu_iepirkumu(iepirkuma_id: str):
    atrastais = dati[dati["Iepirkuma_ID"].astype(str) == iepirkuma_id]
    if atrastais.empty:
        raise HTTPException(status_code=404, detail="Procurement not found")
    return atrastais.iloc[0].to_dict()


@app.get("/statistika", tags=["Procurements"])
def iegut_statistiku():
    summas = pd.to_numeric(dati["Aktuala_liguma_summa"], errors="coerce")
    return {
        "total_procurements": len(dati),
        "average_contract_amount": round(summas.mean(), 2),
        "max_contract_amount": round(summas.max(), 2),
        "min_contract_amount": round(summas.min(), 2),
    }


@app.post("/saglabat/{iepirkuma_id}")
def saglabat_iepirkumu(iepirkuma_id: str):
    atrastais = dati[dati["Iepirkuma_ID"].astype(str) == iepirkuma_id]
    if atrastais.empty:
        raise HTTPException(status_code=404, detail="Procurement not found")
    if iepirkuma_id not in saglabati_iepirkumi:
        saglabati_iepirkumi.append(iepirkuma_id)
    return {"message": "Procurement saved", "iepirkuma_id": iepirkuma_id}


@app.get("/saglabatie")
def iegut_saglabatos_iepirkumus():
    saglabatie = dati[dati["Iepirkuma_ID"].astype(str).isin(saglabati_iepirkumi)]
    return saglabatie.to_dict(orient="records")


@app.delete("/saglabat/{iepirkuma_id}", tags=["Procurements"])
def dzest_saglabato_iepirkumu(iepirkuma_id: str):
    if iepirkuma_id in saglabati_iepirkumi:
        saglabati_iepirkumi.remove(iepirkuma_id)
        return {"message": "Procurement removed from saved list", "iepirkuma_id": iepirkuma_id}
    return {"message": "Procurement was not in saved list", "iepirkuma_id": iepirkuma_id}


@app.get("/proceduras")
def iegut_proceduras():
    proceduras = sorted(dati["Proceduras_veids"].dropna().unique().tolist())
    return {"procedures": proceduras}


@app.get("/cpv_saraksts")
def iegut_cpv_sarakstu(limit: int = 100):
    cpv = sorted(dati["CPV_kods_galvenais_prieksmets"].dropna().astype(str).unique().tolist())
    return {"cpv_codes": cpv[:limit]}


@app.get("/top_pasititaji")
def iegut_top_pasititajus(limit: int = 10):
    return {"top_customers": dati["Pasutitaja_nosaukums"].value_counts().head(limit).to_dict()}


@app.get("/top_uzvaretaji")
def iegut_top_uzvaretajus(limit: int = 10):
    return {"top_winners": dati["Uzvaretaja_nosaukums"].value_counts().head(limit).to_dict()}


@app.get("/top_summas")
def iegut_top_summas(limit: int = 10):
    df = dati.copy()
    df["Aktuala_liguma_summa"] = pd.to_numeric(df["Aktuala_liguma_summa"], errors="coerce")
    return df.sort_values("Aktuala_liguma_summa", ascending=False).head(limit).to_dict(orient="records")


# ---------------------------------------------------------------------------
# Datu atjaunošana
# ---------------------------------------------------------------------------

@app.post("/atjaunot-datus", tags=["Data"])
def atjaunot_datus():
    global dati
    try:
        from update_data import main as atjaunot_main  # noqa: PLC0415
        jauno_rindu_skaits = atjaunot_main(gads=datetime.now().year)
        dati = pd.read_csv("data.csv").fillna("")
        return {"pievienotas_rindas": jauno_rindu_skaits or 0}
    except SystemExit:
        raise HTTPException(status_code=500, detail="Atjaunināšana neizdevās — skatīt backend žurnālus")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# ML prognoze
# ---------------------------------------------------------------------------

@app.post("/prognoze", tags=["Analytics"])
def iegut_prognozi(ieeja: PrognozesIeeja):
    # --- 1. Trenēšana uz rezultāti (data.csv) ---
    df_rez = dati.copy()
    df_rez["interese"] = np.where(
        df_rez["Uzvaretaja_registracijas_numurs"].astype(str) == ieeja.piegadatajs_regs_nr,
        1, 0,
    )

    pozitivi = int(df_rez["interese"].sum())
    if pozitivi < MIN_UZVARAS:
        raise HTTPException(
            status_code=400,
            detail=f"Piegādātājam atrasti tikai {pozitivi} uzvarēti iepirkumi. "
                   f"Nepieciešami vismaz {MIN_UZVARAS}.",
        )

    esosie_features = [f for f in FEATURES if f in df_rez.columns]

    df_train = df_rez[esosie_features + ["interese"]].copy()
    for col in df_train.select_dtypes(include="object").columns:
        df_train[col] = df_train[col].fillna("Nav norādīts")
    for col in df_train.select_dtypes(include=["int64", "float64"]).columns:
        df_train[col] = df_train[col].fillna(df_train[col].median())

    X_train = df_train[esosie_features]
    y_train = df_train["interese"]

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"),
             X_train.select_dtypes(include="object").columns.tolist()),
            ("num", "passthrough",
             X_train.select_dtypes(include=["int64", "float64"]).columns.tolist()),
        ]
    )
    model = XGBClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric="logloss",
        random_state=42,
        scale_pos_weight=int((y_train == 0).sum() / max((y_train == 1).sum(), 1)),
    )
    pipeline = Pipeline(steps=[("preprocessor", preprocessor), ("model", model)])
    pipeline.fit(X_train, y_train)

    # --- 2. Prognozēšana uz izsludinātie (aktīvie iepirkumi) ---
    kesa_faili = sorted(CACHE_DIR.glob("izsludinatie_*.csv"))
    if not kesa_faili:
        raise HTTPException(
            status_code=503,
            detail="Izsludinātie keša faili nav atrasti. Palaidiet 'Atjaunot datus' vispirms.",
        )

    kadri = []
    for f in kesa_faili:
        try:
            kadri.append(pd.read_csv(f, encoding="utf-8", low_memory=False, on_bad_lines="skip"))
        except UnicodeDecodeError:
            kadri.append(pd.read_csv(f, encoding="cp1257", low_memory=False, on_bad_lines="skip"))

    df_iz = pd.concat(kadri, ignore_index=True)
    df_iz = df_iz[~df_iz["Iepirkuma_statuss"].isin(NOSLEGTI_STATUSI)].copy()

    jau_piedalijies_ids = set(df_rez[df_rez["interese"] == 1]["Iepirkuma_ID"].astype(str))
    df_iz = df_iz[~df_iz["Iepirkuma_ID"].astype(str).isin(jau_piedalijies_ids)]

    if df_iz.empty:
        return {"piegadatajs": ieeja.piegadatajs_regs_nr, "uzvaras_skaits": pozitivi, "prognozes": []}

    # Sagatavo pazīmes prognozēšanai
    df_pred = df_iz[esosie_features + ["Iepirkuma_ID"]].copy()
    for col in df_pred.select_dtypes(include="object").columns:
        df_pred[col] = df_pred[col].fillna("Nav norādīts")
    for col in df_pred.select_dtypes(include=["int64", "float64"]).columns:
        df_pred[col] = df_pred[col].fillna(df_pred[col].median())
    for f in esosie_features:
        if f not in df_pred.columns:
            df_pred[f] = "Nav norādīts"

    df_iz = df_iz.copy()
    df_iz["varbatiba"] = (pipeline.predict_proba(df_pred[esosie_features])[:, 1] * 100).round(1)

    # Deduplikā pēc Iepirkuma_ID — katram iepirkumam atstāj vienu rindu ar augstāko varbūtību
    df_iz = df_iz.sort_values("varbatiba", ascending=False).drop_duplicates(subset=["Iepirkuma_ID"], keep="first")

    rezultati = df_iz.sort_values("varbatiba", ascending=False)
    rezultati = rezultati.fillna("").replace([float("inf"), float("-inf")], "")

    return {
        "piegadatajs": ieeja.piegadatajs_regs_nr,
        "uzvaras_skaits": pozitivi,
        "prognozes": rezultati.to_dict(orient="records"),
    }
