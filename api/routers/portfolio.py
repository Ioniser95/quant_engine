from fastapi import APIRouter, Depends, HTTPException
import yfinance as yf
import pandas as pd
import asyncpg
import asyncio
from api.models.schemas import PortfolioRequest, TradeReq, SellReq
from api.core.security import get_current_user
from api.core.database import get_db
from portfolio_optimizer import optimize_portfolio

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])

@router.post("/generate")
async def generate_portfolio(req: PortfolioRequest, db: asyncpg.Connection = Depends(get_db)):
    """Generates an optimized portfolio using Markowitz Efficient Frontier."""
    rows = await db.fetch("SELECT ticker, debt_to_equity, profit_margin FROM universe WHERE is_active = TRUE")
    
    scored_stocks = []
    for row in rows:
        ticker = row["ticker"]
        de = row["debt_to_equity"] if row["debt_to_equity"] is not None else 100.0
        margin = row["profit_margin"] if row["profit_margin"] is not None else 0.05
        
        de_scaled = de / 100.0 if de > 10 else de
        de_score = (de_scaled / 2.0) * 100
        margin_score = 100 - (margin * 100 * 2)
        fund_risk = (0.6 * de_score) + (0.4 * margin_score)
        
        scored_stocks.append((ticker, fund_risk))
        
    scored_stocks.sort(key=lambda x: x[1])
    
    if req.risk_tolerance.lower() == "low":
        candidates = [x[0] for x in scored_stocks[:20]]
    elif req.risk_tolerance.lower() == "high":
        candidates = [x[0] for x in scored_stocks[-40:-20]]
    else:
        mid_point = len(scored_stocks) // 2
        candidates = [x[0] for x in scored_stocks[mid_point-10 : mid_point+10]]
            
    if not candidates:
        raise HTTPException(status_code=400, detail="Database is empty or missing fundamental data.")
            
    result = await asyncio.to_thread(optimize_portfolio, candidates, req.risk_tolerance, req.capital)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return result

@router.get("/holdings")
async def get_portfolio_holdings(current_user: dict = Depends(get_current_user), db: asyncpg.Connection = Depends(get_db)):
    """Fetches the user's current holdings from the database and merges with live prices."""
    user_row = await db.fetchrow("SELECT cash_balance FROM users WHERE id = $1", current_user["user_id"])
    cash_balance = float(user_row["cash_balance"]) if user_row and user_row["cash_balance"] else 0.0

    rows = await db.fetch(
        "SELECT ticker, sum(shares) as shares, sum(allocated_capital) / sum(shares) as avg_price, sum(allocated_capital) as invested FROM portfolios WHERE user_id = $1 GROUP BY ticker HAVING sum(shares) > 0",
        current_user["user_id"]
    )
    
    holdings = []
    tickers = []
    for r in rows:
        holdings.append({
            "ticker": r["ticker"],
            "shares": r["shares"],
            "avgPrice": float(r["avg_price"]),
            "invested": float(r["invested"])
        })
        tickers.append(r["ticker"])
        
    if tickers:
        try:
            yf_tickers = [t + ".NS" for t in tickers]
            data = yf.download(yf_tickers + ["^NSEI"], period="5d", progress=False)["Close"]
            latest_prices = data.iloc[-1].to_dict()
        except Exception:
            latest_prices = {}
    else:
        latest_prices = {}
        
    stats = {
        "invested": 0,
        "current": 0,
        "returns": 0,
        "returnsPct": 0
    }
    
    final_holdings = []
    for h in holdings:
        ltp = latest_prices.get(h["ticker"] + ".NS") or h["avgPrice"] 
        if pd.isna(ltp): ltp = h["avgPrice"]
        
        pnl = (ltp - h["avgPrice"]) * h["shares"]
        pnlPct = ((ltp / h["avgPrice"]) - 1) * 100 if h["avgPrice"] > 0 else 0
        current_val = ltp * h["shares"]
        
        final_holdings.append({
            "ticker": h["ticker"],
            "shares": h["shares"],
            "avgPrice": h["avgPrice"],
            "ltp": ltp,
            "pnl": pnl,
            "pnlPct": pnlPct
        })
        
        stats["invested"] += h["invested"]
        stats["current"] += current_val
        
    if stats["invested"] > 0:
        stats["returns"] = stats["current"] - stats["invested"]
        stats["returnsPct"] = (stats["returns"] / stats["invested"]) * 100
        
    stats["cash_balance"] = cash_balance
    return {"status": "success", "holdings": final_holdings, "stats": stats}

@router.post("/trade")
async def execute_trade(req: TradeReq, current_user: dict = Depends(get_current_user), db: asyncpg.Connection = Depends(get_db)):
    """Records a paper trade for the user's portfolio."""
    tickers = [item["Ticker"] for item in req.basket]
    if not tickers:
        raise HTTPException(status_code=400, detail="Empty basket.")
        
    try:
        yf_tickers = [t + ".NS" for t in tickers]
        data = yf.download(yf_tickers, period="5d", progress=False)["Close"]
        if len(yf_tickers) == 1:
            latest_prices = {yf_tickers[0]: data.iloc[-1]}
        else:
            latest_prices = data.iloc[-1].to_dict()
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to fetch live prices for execution.")
        
    for item in req.basket:
        ticker = item["Ticker"]
        allocated = float(item.get("TargetAmount", item.get("allocated", 0)))
        price = latest_prices.get(ticker + ".NS")
        if pd.isna(price) or price is None:
            continue
            
        shares = int(allocated / price)
        if shares == 0:
            continue
            
        user_row = await db.fetchrow("SELECT cash_balance FROM users WHERE id = $1", current_user["user_id"])
        cash_balance = float(user_row["cash_balance"]) if user_row and user_row["cash_balance"] else 0.0
        
        cost = shares * price
        if cash_balance < cost:
            continue
            
        await db.execute(
            "INSERT INTO portfolios (user_id, ticker, shares, buy_price, allocated_capital) VALUES ($1, $2, $3, $4, $5)",
            current_user["user_id"], ticker, shares, price, cost
        )
        await db.execute("UPDATE users SET cash_balance = cash_balance - $1 WHERE id = $2", cost, current_user["user_id"])
        
    return {"status": "success", "message": "Trade executed successfully!"}

@router.post("/sell")
async def sell_trade(req: SellReq, current_user: dict = Depends(get_current_user), db: asyncpg.Connection = Depends(get_db)):
    """Records a sell trade and adds proceeds to cash_balance."""
    row = await db.fetchrow(
        "SELECT sum(shares) as total_shares, sum(allocated_capital)/sum(shares) as avg_price FROM portfolios WHERE user_id = $1 AND ticker = $2 GROUP BY ticker HAVING sum(shares) > 0",
        current_user["user_id"], req.ticker
    )
    
    if not row or row["total_shares"] < req.shares:
        raise HTTPException(status_code=400, detail="Not enough shares to sell.")
        
    avg_price = float(row["avg_price"])
    
    try:
        data = yf.download([req.ticker + ".NS"], period="5d", progress=False)["Close"]
        if isinstance(data, pd.Series):
            latest_price = float(data.iloc[-1])
        else:
            latest_price = float(data[req.ticker + ".NS"].iloc[-1])
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to fetch live price for execution.")
        
    proceeds = req.shares * latest_price
    
    await db.execute(
        "INSERT INTO portfolios (user_id, ticker, shares, buy_price, allocated_capital) VALUES ($1, $2, $3, $4, $5)",
        current_user["user_id"], req.ticker, -req.shares, avg_price, -(req.shares * avg_price)
    )
    
    await db.execute("UPDATE users SET cash_balance = cash_balance + $1 WHERE id = $2", proceeds, current_user["user_id"])
    
    return {"status": "success", "message": f"Successfully sold {req.shares} shares of {req.ticker} for {proceeds:.2f}"}
