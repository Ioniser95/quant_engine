import yfinance as yf
import pandas as pd
import numpy as np
from scipy.optimize import minimize

def fetch_price_data(tickers):
    """Fetches 1 year of daily close prices for the given tickers."""
    # Add .NS suffix if not present since it's the Indian market
    yf_tickers = [t if t.endswith(".NS") else f"{t}.NS" for t in tickers]
    data = yf.download(yf_tickers, period="5y", progress=False)['Close']
    
    # If only 1 ticker was passed (edge case), yf returns a Series. Convert to DataFrame.
    if isinstance(data, pd.Series):
        data = data.to_frame(yf_tickers[0])
        
    data = data.dropna(axis=1) # Drop any tickers with missing data
    return data

def calculate_portfolio_metrics(weights, returns, cov_matrix, risk_free_rate=0.07):
    """Calculates the expected return, volatility, and Sharpe Ratio of a portfolio."""
    portfolio_return = np.sum(returns.mean() * weights) * 252
    portfolio_volatility = np.sqrt(np.dot(weights.T, np.dot(cov_matrix * 252, weights)))
    sharpe_ratio = (portfolio_return - risk_free_rate) / portfolio_volatility
    return portfolio_return, portfolio_volatility, sharpe_ratio

def negative_sharpe_ratio(weights, returns, cov_matrix, risk_free_rate=0.07):
    """Objective function to minimize (since we want to maximize Sharpe)."""
    return -calculate_portfolio_metrics(weights, returns, cov_matrix, risk_free_rate)[2]

def portfolio_volatility(weights, returns, cov_matrix):
    """Objective function to minimize (for safest portfolio)."""
    return calculate_portfolio_metrics(weights, returns, cov_matrix)[1]

def optimize_portfolio(tickers, risk_tolerance="Medium", investment_amount=10000.0):
    """
    Finds the optimal allocation of capital across the given tickers based on risk_tolerance.
    Returns the target weights, estimated return, and volatility.
    """
    if not tickers:
        return {"error": "No tickers provided for optimization."}
        
    prices = fetch_price_data(tickers)
    
    if prices.empty or prices.shape[1] < 2:
        return {"error": "Not enough valid historical data to optimize portfolio."}
        
    daily_returns = prices.pct_change().dropna()
    cov_matrix = daily_returns.cov()
    
    num_assets = len(prices.columns)
    
    # Constraints: sum of weights = 1.0 (100% of capital)
    constraints = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1})
    
    # Bounds: No short selling (weights between 0 and 1)
    bounds = tuple((0.0, 1.0) for _ in range(num_assets))
    
    # Initial guess: equal weights
    init_guess = num_assets * [1. / num_assets]
    
    if risk_tolerance.lower() == "low":
        # Optimize for Minimum Volatility
        result = minimize(portfolio_volatility, init_guess, args=(daily_returns, cov_matrix),
                          method='SLSQP', bounds=bounds, constraints=constraints)
    else:
        # Default to "High" or "Medium": Optimize for Maximum Sharpe Ratio
        result = minimize(negative_sharpe_ratio, init_guess, args=(daily_returns, cov_matrix),
                          method='SLSQP', bounds=bounds, constraints=constraints)
                          
    if not result.success:
        return {"error": "Optimization engine failed to converge on a solution."}
        
    optimal_weights = result.x
    expected_return, expected_vol, sharpe = calculate_portfolio_metrics(optimal_weights, daily_returns, cov_matrix)
    
    # Format the output
    allocations = []
    for idx, ticker in enumerate(prices.columns):
        weight = optimal_weights[idx]
        if weight > 0.001: # Filter out near-zero allocations (e.g. 0.000000001%)
            allocations.append({
                "Ticker": ticker.replace(".NS", ""),
                "Weight": round(weight * 100, 2),
                "Amount": round(weight * investment_amount, 2)
            })
            
    # Sort by highest allocation
    allocations = sorted(allocations, key=lambda x: x["Weight"], reverse=True)
            
    return {
        "status": "success",
        "optimization_objective": "Minimum Volatility" if risk_tolerance.lower() == "low" else "Maximum Sharpe Ratio",
        "expected_annual_return_pct": round(expected_return * 100, 2),
        "expected_annual_volatility_pct": round(expected_vol * 100, 2),
        "sharpe_ratio": round(sharpe, 2),
        "allocations": allocations
    }
