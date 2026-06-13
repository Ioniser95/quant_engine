# 📈 QuantEngine 

A full-stack algorithmic trading dashboard and quantitative Robo-Advisor. 

QuantEngine allows users to securely create institutional-grade portfolios, run vectorized risk-analysis on the market universe, and generate curated asset baskets based on custom risk tolerances.

## 🚀 Tech Stack

**Frontend:**
* React.js (Vite)
* React Router for protected route navigation
* Lucide React for modern iconography
* Custom CSS modules (Premium Glassmorphic / Dark Theme)

**Backend / Algorithmic Engine:**
* FastAPI (Python) for asynchronous, high-performance API endpoints
* Pandas & NumPy for vectorized financial mathematics
* yfinance for historical market data ingestion
* PostgreSQL (asyncpg) hosted on Supabase for scalable cloud data storage

**Security & Authentication:**
* Bcrypt for irreversible password hashing
* JSON Web Tokens (JWT) for stateless session management
* FastAPI Security dependencies for route protection

## ✨ Core Features

* **Secure Authentication Flow:** Cryptographically secure user registration and login system with JWT generation.
* **Vectorized Market Scanner:** Pulls 1 year of historical data for user-defined tickers and calculates maximum drawdown, rolling volatility, and a blended Risk Index instantly.
* **Quantitative Robo-Advisor:** Takes user capital, time horizon, and risk tolerance to simulate a multi-factor portfolio allocation.
* **Markowitz Efficient Frontier Optimization:** Implements linear algebra and covariance matrices to calculate mathematically optimal portfolio weights and maximize the Sharpe ratio.
* **Vercel Serverless Architecture:** The entire app runs via a unified Vercel deployment, running FastAPI in serverless functions and serving the React app globally via Edge Networks.

## 🛠️ Local Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/YourUsername/quant_engine.git
cd quant_engine
```

### 2. Backend Setup
```bash
# Create and activate a virtual environment
python -m venv venv
# On Windows: venv\Scripts\activate
# On Mac/Linux: source venv/bin/activate

# Install required Python packages
pip install -r requirements.txt

# Environment Setup
# Create a .env file in the root directory and add your Supabase string
# DATABASE_URL="postgresql://postgres:[password]@[host]:6543/postgres"

# Start the FastAPI server locally
uvicorn api.index:app --reload
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🔮 Future Roadmap (Phase 3 & Beyond)

This project has successfully migrated from a local SQLite MVP to a production-grade algorithmic trading suite hosted on Vercel and Supabase. Here is what we should focus on next:

**1. Live Market Infrastructure**
- [ ] **WebSocket Integration:** Upgrade the FastAPI backend to support bidirectional WebSockets, streaming live price ticks and market data directly to the React dashboard without page refreshes.
- [ ] **Automated Trading Execution:** Integrate with a broker API (e.g., Alpaca or Interactive Brokers) to allow users to execute their generated paper-portfolios with real capital automatically.

**2. Interactive Data Visualization**
- [ ] **Dynamic Charting:** Integrate `Recharts` or `TradingView Lightweight Charts` to transition from static text tables to interactive, historical performance graphs.
- [ ] **Portfolio Backtesting:** Allow users to visualize how their AI-generated portfolio would have performed over a custom historical timeframe against the S&P 500 or NIFTY 50.

**3. Advanced AI & Machine Learning**
- [ ] **Predictive Modeling:** Replace simple trailing volatility/drawdown metrics with basic predictive ML models (e.g., LSTM or XGBoost) to forecast forward-looking risk probabilities.
- [ ] **NLP Sentiment Analysis:** Scrape daily financial news headlines and assign sentiment scores to the universe tickers to influence the Robo Advisor's stock-picking engine.

**4. Advanced Security Features**
- [ ] **Password Reset Flow:** Implement a secure, email-based password recovery system (e.g. using Resend) utilizing temporary JWT reset tokens.
- [ ] **OAuth Integration:** Add 'Sign in with Google / GitHub' for a more frictionless onboarding experience.