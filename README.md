# 📈 QuantEngine 

A full-stack algorithmic trading dashboard and quantitative Robo-Advisor. 

QuantEngine allows users to securely create institutional-grade portfolios, run vectorized risk-analysis on the market universe, and generate curated asset baskets based on custom risk tolerances.

## 🚀 Tech Stack

**Frontend:**
* React.js (Vite)
* React Router for protected route navigation
* Lucide React for modern iconography
* Custom CSS modules (Groww/Zerodha-inspired dark theme)

**Backend / Algorithmic Engine:**
* FastAPI (Python) for asynchronous, high-performance API endpoints
* Pandas & NumPy for vectorized financial mathematics
* yfinance for historical market data ingestion
* SQLite (aiosqlite) for local database management

**Security & Authentication:**
* Bcrypt for irreversible password hashing
* JSON Web Tokens (JWT) for stateless session management
* FastAPI Security dependencies for route protection

## ✨ Core Features

* **Secure Authentication Flow:** Cryptographically secure user registration and login system with JWT generation.
* **Vectorized Market Scanner:** Pulls 1 year of historical data for user-defined tickers and calculates maximum drawdown, rolling volatility, and a blended Risk Index instantly.
* **Quantitative Robo-Advisor:** Takes user capital, time horizon, and risk tolerance to simulate a multi-factor portfolio allocation.
* **Fundamental Caching:** Stores debt-to-equity and profit margins in a local database to bypass slow external API calls during bulk scans.

## 🛠️ Local Installation & Setup

### 1. Clone the Repository
```bash
git clone [https://github.com/YourUsername/quant_engine.git](https://github.com/YourUsername/quant_engine.git)
cd quant_engine


# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`

# Install required Python packages
pip install fastapi uvicorn pandas numpy yfinance aiosqlite pyjwt bcrypt pydantic

# Initialize the databases
python init_db.py
python setup_users_db.py

# Start the FastAPI server
uvicorn main:app --reload


cd frontend
npm install
npm run dev


## 🔮 Future Roadmap (Phase 2 & Beyond)

This project is actively being developed. The next phases of QuantEngine will upgrade the platform from a functional MVP to a production-grade algorithmic trading suite.

**1. Advanced Quantitative Mathematics**
- [ ] **Markowitz Efficient Frontier:** Replace the equal-weight allocation algorithm with linear algebra to calculate mathematically optimal portfolio weights.
- [ ] **Sharpe & Sortino Ratios:** Implement risk-adjusted return metrics to evaluate the curated asset baskets against the baseline market.

**2. Interactive Data Visualization**
- [ ] **Dynamic Charting:** Integrate `Recharts` or `TradingView Lightweight Charts` to transition from static text tables to interactive, historical performance graphs.
- [ ] **Portfolio Backtesting:** Allow users to visualize how their AI-generated portfolio would have performed over a custom historical timeframe.

**3. Real-Time Infrastructure**
- [ ] **WebSocket Integration:** Upgrade the FastAPI backend to support bidirectional WebSockets, streaming live price ticks and market data directly to the React dashboard without page refreshes.

**4. Advanced Security Features**
- [ ] **Password Reset Flow:** Implement a secure, email-based password recovery system utilizing temporary JWT reset tokens.

**5. DevOps & Cloud Deployment**
- [ ] **Database Migration:** Transition from local SQLite to a cloud-hosted PostgreSQL database (e.g., Supabase).
- [ ] **Full-Stack Hosting:** Deploy the FastAPI Python engine to Render/Railway and the Vite/React frontend to Vercel for public access.