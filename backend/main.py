from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import random

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
saglabati_iepirkumi = []

@app.get("/")
def home():
    return {"message": "Backend works"}

@app.get("/iepirkumi", tags = ["Procurements"])
def get_iepirkumi(limit: int=20):
    pirmie_iepirkumi = dati.head(limit)
    return pirmie_iepirkumi.to_dict(orient="records")

@app.get("/filtri", tags = ["Procurements"])
def filtret_iepirkumus(
    key: str = "",
    cpv_kods: str = "",
    procedura: str = "",
    sortet_pec: str = "",
    offset: int = 0,
    seciba: str = "asc",
    limit: int = 20
):

    filtreti_dati = dati

    ## meklēšana pēc nosaukuma
    if key != "":
        filtreti_dati = filtreti_dati[
            filtreti_dati["Iepirkuma_nosaukums"].str.contains(
                key,
                case=False,
                na=False
            )
        ]

    ## filtrs pēc CPV
    if cpv_kods != "":
        filtreti_dati = filtreti_dati[
            filtreti_dati["CPV_kods_galvenais_prieksmets"].astype(str).str.contains(
                cpv_kods,
                case=False,
                na=False
            )
        ]

    ## filtrs pēc procedūras
    if procedura != "":
        filtreti_dati = filtreti_dati[
            filtreti_dati["Proceduras_veids"].str.contains(
                procedura,
                case=False,
                na=False
            )
        ]

        ## sortēšana
    if sortet_pec != "":

        augosa_seciba = True

        if seciba == "desc":
            augosa_seciba = False

        try:
            filtreti_dati = filtreti_dati.sort_values(
                by=sortet_pec,
                ascending=augosa_seciba
            )
        except:
            pass

    rezultats = filtreti_dati.iloc[offset:offset + limit]

    return {
        "total": len(filtreti_dati),
        "limit": limit,
        "offset": offset,
        "data": rezultats.to_dict(orient="records")
    }
@app.get("/iepirkums/{iepirkuma_id}")
def iegut_vienu_iepirkumu(iepirkuma_id: str):

    atrastais_iepirkums = dati[
        dati["Iepirkuma_ID"].astype(str) == iepirkuma_id
    ]

    if atrastais_iepirkums.empty:
        raise HTTPException(status_code = 404, detail = "Procurement not found" )

    return atrastais_iepirkums.iloc[0].to_dict()

@app.get("/statistika", tags = ["Procurements"])
def iegut_statistiku():

    liguma_summas = pd.to_numeric(
        dati["Aktuala_liguma_summa"],
        errors="coerce"
    )

    return {
        "total_procurements": len(dati),
        "average_contract_amount": round(liguma_summas.mean(), 2),
        "max_contract_amount": round(liguma_summas.max(), 2),
        "min_contract_amount": round(liguma_summas.min(), 2)
    }

@app.post("/saglabat/{iepirkuma_id}")
def saglabat_iepirkumu(iepirkuma_id: str):

    atrastais_iepirkums = dati[
        dati["Iepirkuma_ID"].astype(str) == iepirkuma_id
    ]

    if atrastais_iepirkums.empty:
        raise HTTPException(status_code = 404, detail = "Procurement not found" )

    if iepirkuma_id not in saglabati_iepirkumi:
        saglabati_iepirkumi.append(iepirkuma_id)

    return {
        "message": "Procurement saved",
        "iepirkuma_id": iepirkuma_id
    }


@app.get("/saglabatie")
def iegut_saglabatos_iepirkumus():

    saglabatie_dati = dati[
        dati["Iepirkuma_ID"].astype(str).isin(saglabati_iepirkumi)
    ]

    return saglabatie_dati.to_dict(orient="records")

@app.delete("/saglabat/{iepirkuma_id}", tags = ["Procurements"])
def dzest_saglabato_iepirkumu(iepirkuma_id: str):

    if iepirkuma_id in saglabati_iepirkumi:
        saglabati_iepirkumi.remove(iepirkuma_id)

        return {
            "message": "Procurement removed from saved list",
            "iepirkuma_id": iepirkuma_id
        }

    return {
        "message": "Procurement was not in saved list",
        "iepirkuma_id": iepirkuma_id
    }

@app.get("/proceduras")
def iegut_proceduras():

    proceduras = dati["Proceduras_veids"].dropna().unique().tolist()

    proceduras = sorted(proceduras)

    return {
        "procedures": proceduras
    }

@app.get("/cpv_saraksts")
def iegut_cpv_sarakstu(limit: int = 100):

    cpv_kodi = dati[
        "CPV_kods_galvenais_prieksmets"
    ].dropna().astype(str).unique().tolist()

    cpv_kodi = sorted(cpv_kodi)

    return {
        "cpv_codes": cpv_kodi[:limit]
    }

@app.get("/top_pasititaji")
def iegut_top_pasititajus(limit: int = 10):

    top_pasititaji = dati["Pasutitaja_nosaukums"].value_counts().head(limit)

    return {
        "top_customers": top_pasititaji.to_dict()
    }


@app.get("/top_uzvaretaji")
def iegut_top_uzvaretajus(limit: int = 10):

    top_uzvaretaji = dati["Uzvaretaja_nosaukums"].value_counts().head(limit)

    return {
        "top_winners": top_uzvaretaji.to_dict()
    }

@app.get("/top_summas")
def iegut_top_summas(limit: int = 10):

    dati_ar_summu = dati.copy()

    dati_ar_summu["Aktuala_liguma_summa"] = pd.to_numeric(
        dati_ar_summu["Aktuala_liguma_summa"],
        errors="coerce"
    )

    top_summas = dati_ar_summu.sort_values(
        by="Aktuala_liguma_summa",
        ascending=False
    ).head(limit)

    return top_summas.to_dict(orient="records")

@app.get("/prognoze/{iepirkuma_id}", tags=["Analytics"])
def iegut_prognozi(iepirkuma_id: str):

    atrastais_iepirkums = dati[
        dati["Iepirkuma_ID"].astype(str) == iepirkuma_id
    ]

    if atrastais_iepirkums.empty:
        raise HTTPException(status_code=404, detail="Procurement not found")

    summa = pd.to_numeric(
        atrastais_iepirkums.iloc[0]["Aktuala_liguma_summa"],
        errors="coerce"
    )

    return {
        "procurement_id": iepirkuma_id,
        "contract_amount": summa,
        "prediction": prediction
    }