import React, { useState, useEffect } from 'react';
import { Target, Briefcase, Zap, ShieldAlert, CheckCircle } from 'lucide-react';

export default function RoboAdvisor() {
  // --- STATE ---
  const [universe, setUniverse] = useState([]);
  const [capital, setCapital] = useState(100000);
  const [horizon, setHorizon] = useState('Medium (3-5 Years)');
  const [riskTolerance, setRiskTolerance] = useState('Moderate');
  
  const [loading, setLoading] = useState(false);
  const [basket, setBasket] = useState(null);
  const [tradeExecuted, setTradeExecuted] = useState(false);

  // Fetch Universe on Mount
  useEffect(() => {
    fetch('http://localhost:8000/api/universe')
      .then(res => res.json())
      .then(data => setUniverse(data.universe))
      .catch(err => console.error("Database connection failed:", err));
  }, []);

  // --- THE ALGORITHM (Connecting UI to your Engine) ---
  const generateBasket = async () => {
    setLoading(true);
    setTradeExecuted(false);
    
    // 1. Grab 15 random stocks from the universe to simulate a sector scan
    const randomStocks = [...universe].sort(() => 0.5 - Math.random()).slice(0, 15);
    const tickers = randomStocks.map(s => s.ticker).join(',');

    try {
      // 2. Run them through your actual Quant Engine!
      const res = await fetch(`http://localhost:8000/api/scan/bulk?tickers=${tickers}`);
      const data = await res.json();
      
      // 3. Mock Allocation Logic based on Risk Tolerance
      // (If Conservative, we would ideally filter for lower risk scores. 
      // For this MVP, we will just take the top 5 and assign capital weights).
      const top5 = data.data.slice(0, 5);
      
      const curated = top5.map(stock => {
        // Equal weight allocation for the prototype
        const allocatedMoney = capital / 5; 
        return {
          ...stock,
          weight: 20, // 20% each
          allocated: allocatedMoney
        };
      });
      
      setBasket(curated);
    } catch (err) {
      alert("Engine disconnected. Check your backend terminal.");
    } finally {
      setLoading(false);
    }
  };

  const executeTrade = () => {
    // In the future, this is where we send data to Supabase/SQLite!
    setTradeExecuted(true);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Zap size={28} color="#00D09C" /> Quantitative Robo-Advisor
        </h1>
        <p style={{ color: '#828F9E' }}>Configure your investment parameters. Our engine will curate an optimal multi-factor portfolio.</p>
      </header>

      {/* --- QUESTIONNAIRE FORM --- */}
      <div style={{ backgroundColor: '#121620', padding: '30px', borderRadius: '12px', border: '1px solid #1E232E', marginBottom: '30px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '30px' }}>
          
          {/* Capital Input */}
          <div>
            <label style={styles.label}><Briefcase size={14} style={{ marginRight: '6px' }} /> INVESTMENT CAPITAL (₹)</label>
            <input 
              type="number" 
              value={capital} 
              onChange={(e) => setCapital(Number(e.target.value))}
              style={styles.input}
            />
          </div>

          {/* Time Horizon Input */}
          <div>
            <label style={styles.label}><Target size={14} style={{ marginRight: '6px' }} /> TIME HORIZON</label>
            <select value={horizon} onChange={(e) => setHorizon(e.target.value)} style={styles.input}>
              <option>Short (1-2 Years)</option>
              <option>Medium (3-5 Years)</option>
              <option>Long (5+ Years)</option>
            </select>
          </div>

          {/* Risk Tolerance Input (Full Width) */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={styles.label}><ShieldAlert size={14} style={{ marginRight: '6px' }} /> RISK TOLERANCE</label>
            <div style={{ display: 'flex', gap: '15px' }}>
              {['Conservative', 'Moderate', 'Aggressive'].map(risk => (
                <button
                  key={risk}
                  onClick={() => setRiskTolerance(risk)}
                  style={{
                    flex: 1, padding: '16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s',
                    backgroundColor: riskTolerance === risk ? 'rgba(0, 208, 156, 0.1)' : '#1E232E',
                    color: riskTolerance === risk ? '#00D09C' : '#828F9E',
                    border: `1px solid ${riskTolerance === risk ? '#00D09C' : '#2A3143'}`
                  }}
                >
                  {risk}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={generateBasket} disabled={loading || universe.length === 0} style={styles.primaryButton}>
          {loading ? 'Running Quant Models...' : 'Generate AI Portfolio Basket'}
        </button>
      </div>

      {/* --- RESULTS DASHBOARD --- */}
      {basket && !tradeExecuted && (
        <div style={{ backgroundColor: '#121620', padding: '30px', borderRadius: '12px', border: '1px solid #00D09C', animation: 'fadeIn 0.5s' }}>
          <h2 style={{ color: '#00D09C', margin: '0 0 20px 0', fontSize: '1.4rem' }}>Optimized Basket Ready</h2>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '20px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1E232E', color: '#828F9E', fontSize: '0.8rem' }}>
                <th style={{ padding: '12px 0' }}>ASSET</th>
                <th style={{ padding: '12px 0' }}>RISK INDEX</th>
                <th style={{ padding: '12px 0' }}>WEIGHT</th>
                <th style={{ padding: '12px 0', textAlign: 'right' }}>ALLOCATION</th>
              </tr>
            </thead>
            <tbody>
              {basket.map(s => (
                <tr key={s.Ticker} style={{ borderBottom: '1px solid #1E232E' }}>
                  <td style={{ padding: '16px 0', fontWeight: 'bold', color: '#fff' }}>{s.Ticker}</td>
                  <td style={{ padding: '16px 0' }}><span style={getRiskBadge(s.Risk)}>{s.Risk}</span></td>
                  <td style={{ padding: '16px 0', color: '#828F9E' }}>{s.weight}%</td>
                  <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: 'bold', color: '#E2E8F0' }}>
                    ₹{s.allocated.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button onClick={executeTrade} style={styles.successButton}>
            Execute Paper Trade
          </button>
        </div>
      )}

      {/* --- SUCCESS STATE --- */}
      {tradeExecuted && (
        <div style={{ backgroundColor: 'rgba(0, 208, 156, 0.1)', padding: '40px', borderRadius: '12px', border: '1px solid #00D09C', textAlign: 'center' }}>
          <CheckCircle size={48} color="#00D09C" style={{ margin: '0 auto 15px auto' }} />
          <h2 style={{ color: '#fff', marginBottom: '10px' }}>Trade Executed Successfully</h2>
          <p style={{ color: '#828F9E' }}>The assets have been added to your simulated portfolio.</p>
        </div>
      )}
    </div>
  );
}

// --- STYLING ---
const styles = {
  label: { display: 'flex', alignItems: 'center', fontSize: '0.75rem', fontWeight: '700', color: '#828F9E', marginBottom: '8px', letterSpacing: '0.5px' },
  input: { width: '100%', backgroundColor: '#1E232E', color: '#fff', border: '1px solid #2A3143', padding: '14px', borderRadius: '8px', outline: 'none', fontSize: '1rem' },
  primaryButton: { width: '100%', backgroundColor: '#00D09C', color: '#121620', border: 'none', padding: '16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.05rem', cursor: 'pointer', transition: 'opacity 0.2s' },
  successButton: { width: '100%', backgroundColor: '#fff', color: '#121620', border: 'none', padding: '16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.05rem', cursor: 'pointer' }
};

const getRiskBadge = (risk) => {
  const isHigh = risk > 70;
  const isMed = risk > 40;
  return {
    padding: '4px 10px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold',
    backgroundColor: isHigh ? 'rgba(229, 57, 53, 0.1)' : isMed ? 'rgba(255, 179, 0, 0.1)' : 'rgba(0, 208, 156, 0.1)',
    color: isHigh ? '#E53935' : isMed ? '#FFB300' : '#00D09C',
    border: `1px solid ${isHigh ? 'rgba(229, 57, 53, 0.3)' : isMed ? 'rgba(255, 179, 0, 0.3)' : 'rgba(0, 208, 156, 0.3)'}`
  };
};