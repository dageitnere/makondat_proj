# EIS Analīze — Publisko iepirkumu analīzes rīks

Tīmekļa lietotne publisko iepirkumu analīzei un ML prognozēšanai. Ļauj piegādātājiem atrast tiem relevantos iepirkumus, balstoties uz vēsturisko uzvaru analīzi.

Dati iegūti no: 
[data.gov.lv]
(https://data.gov.lv/dati/lv/dataset/iepirkumu-rezultatu-datu-grupa)
(https://data.gov.lv/dati/lv/dataset/izsludinato-iepirkumu-datu-grupa)

---

## Funkcionalitāte

- Iepirkumu pārlūkošana ar filtrēšanu pēc atslēgvārdiem, CPV koda un procedūras veida
- Detalizēts iepirkuma sānu panelis
- Statistikas pārskats (kopskaits, vidējā/max/min summa, top pasūtītāji, uzvarētāji)
- **ML prognoze** — ievadot piegādātāja reģistrācijas numuru, sistēma apmāca XGBoost modeli uz vēsturiskajām uzvarām un prognozē intereses rādītāju (0–100%) katram aktīvajam iepirkumam
- Iepirkumu saglabāšana sarakstā
- Datu atjaunināšana no data.gov.lv tieši no lietotnes

---

## Tehnoloģijas

| Daļa | Tehnoloģijas |
|------|-------------|
| Backend | Python 3.13, FastAPI, Uvicorn, Pandas, NumPy, scikit-learn, XGBoost |
| Frontend | React 19, TypeScript 6, Vite 8 |
| Infrastruktūra | Docker, Docker Compose |

---

## Palaišana

### Ar Docker (ieteicams)

Nepieciešams: [Docker Desktop](https://www.docker.com/products/docker-desktop/)

```bash
docker compose up --build
```

Atver pārlūkā: **http://localhost:5173**

---

### Lokāli (bez Docker)

Nepieciešams: Python 3.12+, Node.js 18+

**1. Backend**

```bash
pip install -r requirements.txt
cd backend
python -m uvicorn main:app --reload --port 8000
```

**2. Frontend** (jaunā terminālī)

```bash
cd frontend
npm install
npm run dev
```

Atver pārlūkā: **http://localhost:5173**

---

## API galapunkti

| Metode | Ceļš | Apraksts |
|--------|------|---------|
| GET | `/iepirkumi` | Iepirkumu saraksts (limits: 20) |
| GET | `/filtri` | Filtrēšana ar lapošanu |
| GET | `/iepirkums/{id}` | Atsevišķa iepirkuma detaļas |
| GET | `/statistika` | Kopskaits, vidējā/max/min summa |
| GET | `/proceduras` | Unikālie procedūru veidi |
| GET | `/cpv_saraksts` | Unikālie CPV kodi |
| GET | `/top_pasititaji` | Galvenie pasūtītāji |
| GET | `/top_uzvaretaji` | Galvenie uzvarētāji |
| GET | `/top_summas` | Lielākie līgumi |
| GET | `/saglabatie` | Saglabātie iepirkumi |
| POST | `/saglabat/{id}` | Saglabāt iepirkumu |
| DELETE | `/saglabat/{id}` | Dzēst no saglabātajiem |
| POST | `/atjaunot-datus` | Atjaunināt datus no data.gov.lv |
| POST | `/prognoze` | ML prognoze pēc reģ. numura |

Interaktīvā API dokumentācija: **http://localhost:8000/docs**

---

## ML modelis

Modelis tiek apmācīts dinamiski katram pieprasījumam:

1. Tiek izgūtas piegādātāja vēsturiskās uzvaras no `data.csv` (nepieciešamas ≥5)
2. XGBoost klasifikators apmācās uz vēsturiskajiem datiem
3. Modelis prognozē uzvaras varbūtību visiem aktīvajiem iepirkumiem
4. Rezultāti tiek filtrēti pēc intereses sliekšņa (noklusējums: 0%)

Krāsu kodēšana: 🟢 ≥70% · 🟡 40–70% · 🔴 <40%
