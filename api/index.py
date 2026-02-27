import os
from fastapi import FastAPI, HTTPException
from sqlalchemy import create_engine, text
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import datetime
from dotenv import load_dotenv
import google.generativeai as genai
from pydantic import BaseModel

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
    """Tells the frontend what tabs and charts exist, sorted by tab_order."""
    with engine.connect() as conn:
        # UPDATED: Added tab_order to selection and sorting
        result = conn.execute(text("""
            SELECT series_id, title, source, tab_name, tab_order 
            FROM series_metadata 
            ORDER BY tab_order ASC, series_id ASC
        """)).mappings().all()
        return [dict(row) for row in result]

@app.get("/api/data/{series_id}")
def get_chart_data(series_id: str):
    """Sends the actual dates and values for a specific chart."""
    with engine.connect() as conn:
        result = conn.execute(text(
            "SELECT date, value FROM macro_data WHERE series_id = :series_id ORDER BY date"
        ), {"series_id": series_id}).mappings().all()
        return [dict(row) for row in result]

@app.get("/api/latest/{series_id}")
def get_latest_value(series_id: str):
    """Gets just the single most recent data point for the Watchlist."""
    with engine.connect() as conn:
        result = conn.execute(text(
            "SELECT value FROM macro_data WHERE series_id = :series_id ORDER BY date DESC LIMIT 1"
        ), {"series_id": series_id}).mappings().first()
        if result:
            return {"value": result["value"]}
        return {"value": None}

# --- PHASE 2 ROUTES (Yahoo Finance Market Data & News) ---

@app.get("/api/market/{symbol}")
def get_market_data(symbol: str):
    try:
        ticker = yf.Ticker(symbol)
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
        return {"price": "---", "change": "0.00%", "pos": True}

@app.get("/api/news")
def get_news():
    try:
        ticker = yf.Ticker("SPY")
        raw_news = ticker.news
        clean_news = []
        for item in raw_news:
            news_data = item.get("content", item)
            title = news_data.get("title")
            provider = news_data.get("provider", {})
            publisher = provider.get("displayName") if isinstance(provider, dict) else news_data.get("publisher", "Market News")
            url_dict = news_data.get("canonicalUrl", {})
            link = url_dict.get("url", news_data.get("link"))
            time_val = news_data.get("pubDate", news_data.get("providerPublishTime"))
            
            if isinstance(time_val, str):
                try:
                    dt = datetime.datetime.fromisoformat(time_val.replace('Z', '+00:00'))
                    time_val = int(dt.timestamp())
                except:
                    pass 
            
            if title and link:
                clean_news.append({"title": title, "publisher": publisher, "link": link, "time": time_val})
        return {"data": clean_news[:10]} 
    except Exception as e:
        return {"data": []}

@app.get("/")
def read_root():
    return {"message": "SKXY Macro Terminal API is running!"}


# --- AI CHATBOT ENDPOINT ---

# 1. Tell Python how to read the data Next.js sends
class ChatRequest(BaseModel):
    message: str
    chart_data: str  # This is where we will secretly pass the numbers

# 2. Configure the Gemini Brain using your secret key
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

# We use "gemini-1.5-flash" because it is lightning fast and great for data
ai_model = genai.GenerativeModel('gemini-1.5-flash')

@app.post("/api/chat")
async def chat_with_analyst(request: ChatRequest):
    try:
        # 3. Create the "System Prompt" (The Rules for the AI)
        system_prompt = f"""
        You are an expert macroeconomic analyst. 
        You are directly assisting a user on a financial dashboard.
        Use the following chart data summary to answer the user's question accurately.
        Do not make up any numbers. If the answer isn't in the data, just say you don't have that specific data point right now.
        Keep your answer concise, professional, and easy to read.
        
        CURRENT CHART DATA:
        {request.chart_data}
        """
        
        # 4. Combine the rules with the user's actual question
        full_prompt = f"{system_prompt}\n\nUser Question: {request.message}"
        
        # 5. Send it to Gemini and get the response
        response = ai_model.generate_content(full_prompt)
        
        # 6. Send the text answer back to the Next.js website
        return {"answer": response.text}
    
    except Exception as e:
        return {"error": str(e)}