import os
from fastapi import FastAPI, HTTPException
from sqlalchemy import create_engine, text
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)


DATABASE_URL = os.getenv("POSTGRES_URL")

# 2. If no Vercel password found (e.g. running locally), use localhost
if not DATABASE_URL:
    DATABASE_URL = "postgresql://postgres:Qwertyuiop12$$@localhost:5432/macro_db"

# 3. Fix the "postgres://" bug for Python
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

@app.get("/")
def read_root():
    return {"status": "online", "message": "Macro Data API is connected!"}


@app.get("/series")
def get_series_list():
    try:
        with engine.connect() as conn:
            query = text("SELECT slug, title, frequency, units FROM series_registry")
            result = conn.execute(query)
            series = [row._asdict() for row in result]
            return {"data": series}
    except Exception as e:
        return {"error": str(e)}


@app.get("/series/{slug}")
def get_series_data(slug: str):
    try:
        query = text("SELECT date, value FROM observations WHERE series_slug = :slug ORDER BY date ASC")
        
        
        df = pd.read_sql(query, engine, params={"slug": slug})
        
        if df.empty:
            raise HTTPException(status_code=404, detail="Series not found")

        df['date'] = df['date'].astype(str)
        
        return {
            "slug": slug,
            "count": len(df),
            "data": df.to_dict(orient="records")
        }
    except Exception as e:
        return {"error": str(e)}