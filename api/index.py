import os
from fastapi import FastAPI, HTTPException
from sqlalchemy import create_engine, text
from fastapi.middleware.cors import CORSMiddleware
import datetime
from dotenv import load_dotenv
from pydantic import BaseModel
import requests  # <-- We use this built-in web library for EVERYTHING now! (No yfinance)

load_dotenv()

# --- DATABASE CONNECTION SETUP ---
DATABASE_URL = os.getenv("DATABASE_URL")

# Fix string for SQLAlchemy and force SSL for Neon
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
if "?" not in DATABASE_URL:
    DATABASE_URL += "?sslmode=require"
elif "sslmode" not in DATABASE_URL:
    DATABASE_URL += "&sslmode=require"

engine = create_engine(DATABASE_URL)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- PHASE 3 ROUTES (Dynamic Tabs & Charts) ---

@app.get("/api/tabs")
def get_tabs_metadata():
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT series_id, title, source, tab_name, tab_order 
            FROM series_metadata 
            ORDER BY tab_order ASC, series_id ASC
        """)).mappings().all()
        return [dict(row) for row in result]

@app.get("/api/data/{series_id}")
def get_chart_data(series_id: str):
    with engine.connect() as conn:
        result = conn.execute(text(
            "SELECT date, value FROM macro_data WHERE series_id = :series_id ORDER BY date"
        ), {"series_id": series_id}).mappings().all()
        return [dict(row) for row in result]

@app.get("/api/latest/{series_id}")
def get_latest_value(series_id: str):
    with engine.connect() as conn:
        result = conn.execute(text(
            "SELECT value FROM macro_data WHERE series_id = :series_id ORDER BY date DESC LIMIT 1"
        ), {"series_id": series_id}).mappings().first()
        if result:
            return {"value": result["value"]}
        return {"value": None}

# --- DIRECT YAHOO FINANCE ROUTES (No yfinance library needed!) ---

@app.get("/api/market/{symbol}")
def get_market_data(symbol: str):
    headers = {'User-Agent': 'Mozilla/5.0'}
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=2d"
    try:
        res = requests.get(url, headers=headers, timeout=5)
        data = res.json()
        meta = data['chart']['result'][0]['meta']
        price = meta['regularMarketPrice']
        prev_close = meta['chartPreviousClose']

        change_percent = ((price - prev_close) / prev_close) * 100
        return {
            "price": f"{price:,.2f}",
            "change": f"{change_percent:+.2f}%",
            "pos": change_percent >= 0
        }
    except Exception:
        return {"price": "---", "change": "0.00%", "pos": True}

@app.get("/api/news")
def get_news():
    headers = {'User-Agent': 'Mozilla/5.0'}
    url = "https://query2.finance.yahoo.com/v1/finance/search?q=SPY&newsCount=10"
    try:
        res = requests.get(url, headers=headers, timeout=5)
        data = res.json()
        news_items = data.get('news', [])
        clean_news = []
        for item in news_items:
            clean_news.append({
                "title": item.get("title", ""),
                "publisher": item.get("publisher", "Market News"),
                "link": item.get("link", "#"),
                "time": item.get("providerPublishTime", 0)
            })
        return {"data": clean_news[:10]}
    except Exception:
        return {"data": []}

@app.get("/")
def read_root():
    return {"message": "SKXY Macro Terminal API is running!"}


# --- AI CHATBOT ENDPOINT (GROQ / LLAMA 3 METHOD) ---

class ChatRequest(BaseModel):
    message: str
    chart_data: str

@app.post("/api/chat")
async def chat_with_analyst(request: ChatRequest):
    try:
        # Fetch the Groq key from your environment variables
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            return {"answer": "Backend Error: GROQ_API_KEY is missing in Vercel/Environment!"}
        
        # 1. Create the Rules
        system_prompt = f"""
        You are an expert macroeconomic analyst. 
        You are directly assisting a user on a financial dashboard.
        Use the following chart data summary to answer the user's question accurately.
        Do not make up any numbers. If the answer isn't in the data, just say you don't have that specific data point right now.
        Keep your answer concise, professional, and easy to read.
        
        CURRENT CHART DATA:
        {request.chart_data}
        """
        
        # 2. Make a DIRECT web request to Groq
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "llama3-8b-8192",  # Fast, smart model
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.message}
            ],
            "temperature": 0.2
        }
        
        response = requests.post(url, json=payload, headers=headers)
        
        if response.status_code != 200:
            return {"answer": f"Groq API Error: {response.text}"}
            
        data = response.json()
        
        # 3. Parse the answer
        try:
            answer = data["choices"][0]["message"]["content"]
            return {"answer": answer}
        except Exception:
            return {"answer": "Sorry, the AI returned an empty response."}
            
    except Exception as e:
        return {"answer": f"AI Connection Error: {str(e)}"}