import yfinance as yf
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

def fetch_data(ticker: str, start_date: str, end_date: str) -> pd.DataFrame:
    """Fetches historical stock data and cleans the formatting."""
    print(f"Fetching data for {ticker}...")
    data = yf.download(ticker, start=start_date, end=end_date)
    
    # Flatten the double-header columns yfinance returns
    if isinstance(data.columns, pd.MultiIndex):
        data.columns = data.columns.get_level_values(0)
        
    return data

def calculate_risk_metrics(data: pd.DataFrame) -> pd.DataFrame:
    """Calculates daily returns, volatility, drawdown, and the final Risk Index."""
    print("Calculating risk metrics...")
    
    # Base Math
    data['Daily_Return'] = data['Close'].pct_change()
    data['Volatility'] = data['Daily_Return'].rolling(window=20).std() * np.sqrt(252)
    
    data['Rolling_Max'] = data['Close'].rolling(window=252, min_periods=1).max()
    data['Drawdown'] = (data['Close'] / data['Rolling_Max']) - 1.0
    
    # Clean up empty rows before calculating the final index
    data.dropna(inplace=True)
    
    # --- THE RISK INDEX FORMULA ---
    # 1. Normalize Volatility (Assume 0.40 is max risk)
    data['Vol_Score'] = (data['Volatility'] / 0.40) * 100
    data['Vol_Score'] = data['Vol_Score'].clip(upper=100) # Caps max score at 100
    
    # 2. Normalize Drawdown (Assume -0.30 is max risk)
    data['DD_Score'] = (data['Drawdown'].abs() / 0.30) * 100
    data['DD_Score'] = data['DD_Score'].clip(upper=100)
    
    # 3. Final Blended Risk Index (50/50 Weighting)
    data['Risk_Index'] = (0.5 * data['Vol_Score']) + (0.5 * data['DD_Score'])
    
    return data

def plot_risk_dashboard(data: pd.DataFrame, ticker: str):
    """Generates a visual dashboard of the stock price and its custom Risk Index."""
    print("Generating Risk Dashboard...")
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 8), sharex=True)

    # Plot 1: Price
    ax1.plot(data.index, data['Close'], color='black')
    ax1.set_title(f'{ticker} Stock Price')
    ax1.grid(True, alpha=0.3)

    # Plot 2: Our Custom Risk Index (0 - 100)
    # We will color the line red if risk crosses 50, green if below 50
    ax2.plot(data.index, data['Risk_Index'], color='blue', label='Risk Score')
    ax2.axhline(50, color='red', linestyle='--', alpha=0.5, label='High Risk Threshold')
    ax2.fill_between(data.index, data['Risk_Index'], 0, color='blue', alpha=0.1)
    
    ax2.set_title('AI Risk Index (0-100 Score)')
    ax2.set_ylabel('Risk Level')
    ax2.set_ylim(0, 100)
    ax2.legend()
    ax2.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.show()

# --- MAIN EXECUTION PIPELINE ---
if __name__ == "__main__":
    target_ticker = "AAPL"
    
    # 1. Fetch
    market_data = fetch_data(target_ticker, start_date="2023-01-01", end_date="2024-01-01")
    
    # 2. Process
    analyzed_data = calculate_risk_metrics(market_data)
    
    # 3. View Latest Results
    print("\nLatest 5 Days of Risk Index:")
    print("-" * 50)
    print(analyzed_data[['Close', 'Volatility', 'Drawdown', 'Risk_Index']].tail().round(3))
    
    # 4. Visualize
    plot_risk_dashboard(analyzed_data, target_ticker)