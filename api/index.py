import os
from fastapi import FastAPI, HTTPException
from sqlalchemy import create_engine, text
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import yfinance as yf

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATABASE CONNECTION SETUP ---
DATABASE_URL = os.getenv("POSTGRES_URL")

# Fallback for local testing
if not DATABASE_URL:
    DATABASE_URL = "postgresql://postgres:Qwertyuiop12$$@localhost:5432/macro_db"

# Fix 1: Handle "postgres://" for Python
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Fix 2: FORCE SSL (Required for Vercel/Neon)
if "?" not in DATABASE_URL:
    DATABASE_URL += "?sslmode=require"
else:
    if "sslmode" not in DATABASE_URL:
        DATABASE_URL += "&sslmode=require"

engine = create_engine(DATABASE_URL)

# --- ROUTES (Updated with /api prefix) ---

@app.get("/api")
def read_root():
    return {"status": "online", "message": "Macro Data API is connected!"}

@app.get("/api/series")
def get_series_list():
    try:
        with engine.connect() as conn:
            query = text("SELECT slug, title, frequency, units FROM series_registry")
            result = conn.execute(query)
            series = [row._asdict() for row in result]
            return {"data": series}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/series/{slug}")
def get_series_data(slug: str):
    try:
        query = text("SELECT date, value FROM observations WHERE series_slug = :slug ORDER BY date ASC")
        
        df = pd.read_sql(query, engine, params={"slug": slug})
        
        if df.empty:
            # Note: This is your CUSTOM error message. 
            # If you see this, the API works but the DB is empty.
            raise HTTPException(status_code=404, detail="Series not found")

        df['date'] = df['date'].astype(str)
        
        return {
            "slug": slug,
            "count": len(df),
            "data": df.to_dict(orient="records")
        }
    except Exception as e:
        return {"error": str(e)}
    

    # ... existing code ...

@app.get("/api/market/{symbol}")
def get_market_data(symbol: str):
    try:
        # Fetch data from Yahoo Finance
        ticker = yf.Ticker(symbol)
        
        # Get latest price and previous close
        # 'fast_info' is much faster than downloading history
        price = ticker.fast_info.last_price
        prev_close = ticker.fast_info.previous_close
        
        if price is None or prev_close is None:
            return {"price": "---", "change": "0.00%", "pos": True}

        change_percent = ((price - prev_close) / prev_close) * 100
        
        return {
            "price": f"{price:,.2f}",
            "change": f"{change_percent:+.2f}%",
            "pos": change_percent >= 0
        }
    except Exception as e:
        print(f"Market fetch error for {symbol}: {e}")
        return {"price": "---", "change": "0.00%", "pos": True}