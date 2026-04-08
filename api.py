from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import pandas as pd
import numpy as np
import concurrent.futures

# Initialize the API Server
app = FastAPI(title="Quant Risk Engine API", version="1.0")

# Security Configuration: Allow the React frontend to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows any frontend to connect during local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_fundamental_score(ticker_obj):
    try:
        info = ticker_obj.info
        de_ratio = info.get('debtToEquity', 100) / 100 
        de_score = (de_ratio / 2.0) * 100 
        margin = info.get('profitMargins', 0.05)
        margin_score = 100 - (margin * 100 * 2) 
        
        fundamental_risk = (0.6 * de_score) + (0.4 * margin_score)
        return np.clip(fundamental_risk, 0, 100)
    except:
        return 50 

def process_single_stock(ticker):
    try:
        t = yf.Ticker(ticker)
        data = t.history(period="1y")
        
        if data.empty: return None
        
        returns = data['Close'].pct_change()
        vol = (returns.rolling(20).std() * np.sqrt(252)).iloc[-1]
        dd = ((data['Close'] / data['Close'].rolling(252, min_periods=1).max()) - 1).iloc[-1]
        
        price_risk = np.clip(((vol/0.4)*50) + (abs(dd/0.3)*50), 0, 100)
        fundamental_risk = get_fundamental_score(t)
        master_score = (0.5 * price_risk) + (0.5 * fundamental_risk)
        
        return {
            "Ticker": ticker.replace(".NS", ""),
            "Risk": round(master_score, 2),
            "Price_Risk": round(price_risk, 2),
            "Fund_Risk": round(fundamental_risk, 2)
        }
    except Exception as e:
        return None

# --- API ENDPOINTS ---

@app.get("/")
def read_root():
    return {"message": "Quant Engine API is live. Navigate to /docs for interactive testing."}

# The main bridge: React will call this URL
# Default fallback is your personalized portfolio
@app.get("/api/scan")
def scan_market(tickers: str = Query("ETERNAL.NS,ATGL.NS,DCXINDIA.NS,RELIANCE.NS,HDFCBANK.NS,ZOMATO.NS,AETHER.NS")):
    
    # Clean up the string React sends us into a proper Python list
    ticker_list = [t.strip().upper() for t in tickers.split(",")]
    results = []

    # Spin up the concurrent threads
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        future_to_stock = {executor.submit(process_single_stock, stock): stock for stock in ticker_list}
        for future in concurrent.futures.as_completed(future_to_stock):
            res = future.result()
            if res:
                results.append(res)

    # Sort the JSON by Risk from lowest to highest
    sorted_results = sorted(results, key=lambda x: x["Risk"])
    
    # Hand the package back to the frontend
    return {
        "status": "success",
        "scanned_count": len(sorted_results),
        "data": sorted_results
    }