from fastapi import APIRouter, Query, Depends, HTTPException
import yfinance as yf
import pandas as pd
import numpy as np
import asyncpg
from api.core.database import get_db
import requests

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

@router.get("/scan/search-ticker")
async def search_ticker(query: str, db: asyncpg.Connection = Depends(get_db)):
    """Hits Yahoo Finance autocomplete to resolve company names to NSE tickers, heavily augmented by local DB."""
    try:
        results = []
        seen_symbols = set()
        
        # 1. Search Local Database First (super fast & guaranteed Indian stocks)
        local_rows = await db.fetch(
            "SELECT ticker, name FROM universe WHERE ticker ILIKE $1 OR name ILIKE $1 LIMIT 5",
            f"%{query}%"
        )
        for row in local_rows:
            t = row['ticker']
            sym = t if t.endswith('.NS') or t.endswith('.BO') else f"{t}.NS"
            seen_symbols.add(sym)
            results.append({
                "symbol": sym,
                "shortname": row["name"],
                "longname": row["name"],
                "exchange": "NSI"
            })

        # 2. Search Yahoo Finance (ask for 50 results to ensure Indian stocks aren't pushed out by US stocks)
        url = f"https://query2.finance.yahoo.com/v1/finance/search?q={query}&quotesCount=50"
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers)
        data = response.json()
        
        for quote in data.get('quotes', []):
            exchange = quote.get('exchange', '')
            symbol = quote.get('symbol', '')
            if exchange in ['NSI', 'BSE'] or symbol.endswith('.NS') or symbol.endswith('.BO'):
                if symbol not in seen_symbols:
                    seen_symbols.add(symbol)
                    results.append({
                        "symbol": symbol,
                        "shortname": quote.get('shortname', ''),
                        "longname": quote.get('longname', ''),
                        "exchange": exchange
                    })
                    
        # Return top 10 combined results
        return {"status": "success", "results": results[:10]}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/scan/analyze-hybrid")
async def analyze_hybrid_ticker(ticker: str, db: asyncpg.Connection = Depends(get_db)):
    """Analyzes a single ticker. If missing from universe, fetches metadata and inserts it."""
    ticker = ticker.strip().upper()
    db_ticker = ticker.replace(".NS", "").replace(".BO", "")
    
    # Check if in DB
    row = await db.fetchrow("SELECT ticker, debt_to_equity, profit_margin FROM universe WHERE ticker = $1", db_ticker)
    
    if not row:
        # Fetch from yfinance
        try:
            query_ticker = ticker if ".NS" in ticker or ".BO" in ticker else f"{ticker}.NS"
            t = yf.Ticker(query_ticker)
            info = t.info
            name = info.get('shortName') or info.get('longName') or db_ticker
            industry = info.get('industry', 'Unknown')
            de = info.get('debtToEquity', 100)
            if de is None: de = 100.0
            margin = info.get('profitMargins', 0.05)
            if margin is None: margin = 0.05
            
            # Insert into DB
            await db.execute(
                "INSERT INTO universe (ticker, name, industry, debt_to_equity, profit_margin, is_active) VALUES ($1, $2, $3, $4, $5, TRUE) ON CONFLICT (ticker) DO NOTHING",
                db_ticker, name, industry, de, margin
            )
            fund_data = {"de": de, "margin": margin}
        except Exception as e:
            fund_data = {"de": 100.0, "margin": 0.05}
    else:
        fund_data = {
            "de": row["debt_to_equity"] if row["debt_to_equity"] is not None else 100.0, 
            "margin": row["profit_margin"] if row["profit_margin"] is not None else 0.05
        }
        
    # Vectorized Price Download for single ticker
    query_ticker = f"{db_ticker}.NS"
    df = yf.download(query_ticker, period="5y", progress=False)
    if df.empty: return {"status": "error", "message": "Failed to fetch data"}
    
    try:
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = [col[0] for col in df.columns]
        
        closes = df['Close']
        returns = closes.pct_change()
        
        vol = returns.rolling(window=20).std().iloc[-1] * np.sqrt(252)
        rolling_max = closes.rolling(window=252, min_periods=1).max()
        dd = ((closes / rolling_max) - 1).iloc[-1]
        
        price_risk = np.clip(((vol/0.4)*50) + (abs(dd/0.3)*50), 0, 100)
        de_score = (fund_data["de"] / 200.0) * 100
        margin_score = 100 - (fund_data["margin"] * 100 * 2)
        fundamental_risk = np.clip((0.6 * de_score) + (0.4 * margin_score), 0, 100)
        
        master_score = (0.5 * price_risk) + (0.5 * fundamental_risk)
        
        result = {
            "Ticker": db_ticker,
            "Risk": round(master_score, 2),
            "Price_Risk": round(price_risk, 2),
            "Fund_Risk": round(fundamental_risk, 2)
        }
        return {"status": "success", "data": [result]}
    except Exception as e:
        return {"status": "error", "message": str(e)}

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
async def get_ticker_history(ticker: str, period: str = "6mo"):
    # Ensure standard yfinance ticker format by building it cleanly
    db_ticker = ticker.replace(".NS", "").replace(".BO", "")
    query_ticker = f"{db_ticker}.NS"
    try:
        is_intraday = period in ["1d", "1wk"]
        
        if period == "1d":
            df = yf.download(query_ticker, period="1d", interval="5m", progress=False)
        elif period == "1wk":
            df = yf.download(query_ticker, period="5d", interval="15m", progress=False)
        else:
            df = yf.download(query_ticker, period=period, progress=False)
            
        if df.empty:
            return {"status": "error", "message": "No data found"}
        
        # Handle yfinance multi-index columns if present
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = [col[0] for col in df.columns]

        df = df.reset_index()
        date_col = 'Date' if 'Date' in df.columns else 'Datetime' if 'Datetime' in df.columns else df.columns[0]
        
        # Format for TradingView Lightweight Charts
        chart_data = []
        for _, row in df.iterrows():
            # UTCTimestamp for intraday, YYYY-MM-DD string for daily
            t = int(row[date_col].timestamp()) if is_intraday else row[date_col].strftime('%Y-%m-%d')
            
            chart_data.append({
                "time": t,
                "open": round(float(row['Open']), 2),
                "high": round(float(row['High']), 2),
                "low": round(float(row['Low']), 2),
                "close": round(float(row['Close']), 2)
            })
            
        return {"status": "success", "data": chart_data}
    except Exception as e:
        return {"status": "error", "message": str(e)}
