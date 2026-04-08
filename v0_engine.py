import yfinance as yf
import pandas as pd
import numpy as np

MY_STOCKS = ["ETERNAL.NS", "ATGL.NS", "DCXINDIA.NS", "RELIANCE.NS", "HDFCBANK.NS"]

def get_fundamental_score(ticker_obj):
    """Pulls balance sheet data and returns a 0-100 Risk Score."""
    try:
        info = ticker_obj.info
        
        # 1. Debt to Equity (Lower is better)
        de_ratio = info.get('debtToEquity', 100) / 100 
        de_score = (de_ratio / 2.0) * 100 
        
        # 2. Profit Margin (Higher is better)
        margin = info.get('profitMargins', 0.05)
        margin_score = 100 - (margin * 100 * 2) 
        
        fundamental_risk = (0.6 * de_score) + (0.4 * margin_score)
        return np.clip(fundamental_risk, 0, 100)
    except:
        return 50 

def calculate_v3_master_risk(ticker):
    t = yf.Ticker(ticker)
    data = t.history(period="1y")
    
    if data.empty: 
        return {"Ticker": ticker, "Master_Risk": "Data Not Found"}
    
    # --- Part A: Price Math (V2 Logic) ---
    returns = data['Close'].pct_change()
    vol = (returns.rolling(20).std() * np.sqrt(252)).iloc[-1]
    dd = ((data['Close'] / data['Close'].rolling(252, min_periods=1).max()) - 1).iloc[-1]
    
    # FIX: Capping the price risk so it never exceeds 100
    raw_price_risk = ((vol/0.4)*50) + (abs(dd/0.3)*50)
    price_risk = np.clip(raw_price_risk, 0, 100)
    
    # --- Part B: Balance Sheet Math (V3 Logic) ---
    fundamental_risk = get_fundamental_score(t)
    
    # --- Final Blend ---
    master_score = (0.5 * price_risk) + (0.5 * fundamental_risk)
    
    return {
        "Ticker": ticker.replace(".NS", ""),
        "Master_Score": round(master_score, 2),
        "Price_Risk": round(price_risk, 2),
        "Fund_Risk": round(fundamental_risk, 2)
    }

# --- Execution ---
print("\nScanning Portfolio with Balance Sheet Logic...")
print("-" * 55)
results = []
for stock in MY_STOCKS:
    results.append(calculate_v3_master_risk(stock))

# Print as a clean, sorted table
df = pd.DataFrame(results)
print(df.to_string(index=False))
print("-" * 55)