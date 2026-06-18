from fastapi import APIRouter, Query, Depends, HTTPException
import yfinance as yf
import pandas as pd
import numpy as np
import asyncpg
from api.core.database import get_db

router = APIRouter(prefix="/api", tags=["scanner"])

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

@router.get("/universe")
async def get_active_universe(db: asyncpg.Connection = Depends(get_db)):
    """Fetches the NIFTY 500 universe from the PostgreSQL database."""
    rows = await db.fetch("SELECT ticker, name, industry FROM universe WHERE is_active = TRUE")
    universe = [{"ticker": row["ticker"], "name": row["name"], "industry": row["industry"]} for row in rows]
    return {"count": len(universe), "universe": universe}

@router.get("/scan/bulk")
async def scan_market_bulk(tickers: str = Query(..., description="Comma-separated tickers"), db: asyncpg.Connection = Depends(get_db)):
    ticker_list = [t.strip().upper() for t in tickers.split(",")]
    
    # Fetch Fundamentals from DB instantly
    fundamentals_map = {}
    
    # We dynamically build the SQL query to only fetch the requested tickers
    placeholders = ','.join(f'${i+1}' for i in range(len(ticker_list)))
    query = f"SELECT ticker, debt_to_equity, profit_margin FROM universe WHERE ticker IN ({placeholders})"
    
    rows = await db.fetch(query, *ticker_list)
    for row in rows:
        fundamentals_map[row["ticker"]] = {
            "de": row["debt_to_equity"],
            "margin": row["profit_margin"]
        }

    # Vectorized Price Download
    df = yf.download(ticker_list, period="5y", progress=False)
    if df.empty: return {"status": "error", "message": "Failed to fetch data"}

    closes = df['Close']
    returns = closes.pct_change()
    
    vols = returns.rolling(window=20).std() * np.sqrt(252)
    latest_vols = vols.iloc[-1]
    
    rolling_max = closes.rolling(window=252, min_periods=1).max()
    drawdowns = (closes / rolling_max) - 1
    latest_dds = drawdowns.iloc[-1]
    
    results = []
    for ticker in ticker_list:
        try:
            vol = latest_vols.get(ticker, 0)
            dd = latest_dds.get(ticker, 0)
            
            if pd.isna(vol) or pd.isna(dd): continue
                
            price_risk = np.clip(((vol/0.4)*50) + (abs(dd/0.3)*50), 0, 100)
            
            # Calculate Fundamental Risk using cached DB data
            fund_data = fundamentals_map.get(ticker, {"de": 100.0, "margin": 0.05})
            
            de_score = (fund_data["de"] / 200.0) * 100
            margin_score = 100 - (fund_data["margin"] * 100 * 2)
            fundamental_risk = np.clip((0.6 * de_score) + (0.4 * margin_score), 0, 100)
            
            master_score = (0.5 * price_risk) + (0.5 * fundamental_risk)
            
            results.append({
                "Ticker": ticker.replace(".NS", ""),
                "Risk": round(master_score, 2),
                "Price_Risk": round(price_risk, 2),
                "Fund_Risk": round(fundamental_risk, 2)
            })
        except Exception as e:
            continue

    sorted_results = sorted(results, key=lambda x: x["Risk"])
    return {"status": "success", "scanned_count": len(sorted_results), "data": sorted_results}

@router.get("/scan/history/{ticker}")
async def get_ticker_history(ticker: str):
    # Ensure standard yfinance ticker format (e.g. .NS for India)
    query_ticker = ticker if ".NS" in ticker else f"{ticker}.NS"
    try:
        # Download 3 months of daily data
        df = yf.download(query_ticker, period="3mo", progress=False)
        if df.empty:
            return {"status": "error", "message": "No data found"}
        
        # Handle yfinance multi-index columns if present
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = [col[0] for col in df.columns]

        df = df.reset_index()
        date_col = 'Date' if 'Date' in df.columns else 'Datetime' if 'Datetime' in df.columns else df.columns[0]
        
        # Format for TradingView Lightweight Charts: { time: 'YYYY-MM-DD', open, high, low, close }
        chart_data = []
        for _, row in df.iterrows():
            chart_data.append({
                "time": row[date_col].strftime('%Y-%m-%d'),
                "open": round(float(row['Open']), 2),
                "high": round(float(row['High']), 2),
                "low": round(float(row['Low']), 2),
                "close": round(float(row['Close']), 2)
            })
            
        return {"status": "success", "data": chart_data}
    except Exception as e:
        return {"status": "error", "message": str(e)}
