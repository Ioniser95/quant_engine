import yfinance as yf
import pandas as pd
import numpy as np

# Swapped TMPV (too new) for ICICIBANK (long history) to ensure data exists
TEST_STOCKS = ["RELIANCE.NS", "ETERNAL.NS", "HDFCBANK.NS", "ICICIBANK.NS", "AETHER.NS"]

SIMULATION_DATE = "2024-04-01" 
END_DATE = "2025-04-01"

def calculate_historical_risk(ticker, sim_date):
    """Calculates the Risk Score using ONLY data available before the sim_date."""
    try:
        t = yf.Ticker(ticker)
        data = t.history(start="2023-04-01", end=sim_date)
        
        # Lowered strict requirement to 200 days to account for market holidays
        if data.empty or len(data) < 200:
            return None
            
        # 1. Market Math (Point-in-Time)
        returns = data['Close'].pct_change()
        vol = (returns.rolling(20).std() * np.sqrt(252)).iloc[-1]
        dd = ((data['Close'] / data['Close'].rolling(252, min_periods=1).max()) - 1).iloc[-1]
        
        price_risk = np.clip(((vol/0.4)*50) + (abs(dd/0.3)*50), 0, 100)
        
        # 2. Fundamental Math 
        info = t.info
        de_ratio = info.get('debtToEquity', 100) / 100 
        margin = info.get('profitMargins', 0.05)
        fund_risk = np.clip((0.6 * (de_ratio / 2.0 * 100)) + (0.4 * (100 - (margin * 100 * 2))), 0, 100)
        
        master_score = (0.5 * price_risk) + (0.5 * fund_risk)
        
        # Get actual future price to see if our prediction was right
        future_data = t.history(start=sim_date, end=END_DATE)
        if future_data.empty:
            return None
            
        buy_price = future_data['Close'].iloc[0]
        sell_price = future_data['Close'].iloc[-1]
        actual_return = ((sell_price - buy_price) / buy_price) * 100
        
        return {
            "Stock": ticker.replace(".NS", ""),
            "Historical_Risk_Score": round(master_score, 2),
            "Hypothetical_1Yr_Return": round(actual_return, 2)
        }
        
    except Exception as e:
        return None

# --- RUN THE SIMULATION ---
print(f"🕰️ TIME MACHINE ACTIVATED: Traveling back to {SIMULATION_DATE}...")
print("-" * 65)

results = []
for stock in TEST_STOCKS:
    res = calculate_historical_risk(stock, SIMULATION_DATE)
    if res:
        results.append(res)

# THE FIX: Check if the list is empty before sorting to prevent KeyError
if len(results) == 0:
    print("❌ Simulation Failed: Could not fetch enough historical data.")
    print("This is usually due to a yfinance API timeout. Try running the script again.")
else:
    df = pd.DataFrame(results).sort_values(by="Historical_Risk_Score")

    print("Here is what our Engine told us to buy 1 year ago, and how it performed:")
    print("\n🟢 THE SAFEST BET (Engine Recommendation):")
    best = df.iloc[0]
    print(f"Bought {best['Stock']} with a low risk score of {best['Historical_Risk_Score']}. Return: {best['Hypothetical_1Yr_Return']}%")

    print("\n🔴 THE RISKIEST BET (Engine Warning):")
    worst = df.iloc[-1]
    print(f"Avoided {worst['Stock']} due to high risk score of {worst['Historical_Risk_Score']}. Return: {worst['Hypothetical_1Yr_Return']}%")

    print("\n--- FULL SIMULATION RESULTS ---")
    print(df.to_string(index=False))