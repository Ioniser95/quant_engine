import React, { useState, useEffect } from 'react';
import { Target, Briefcase, Zap, ShieldCheck, CheckCircle, Flame, Scale, Sparkles, TrendingUp, ArrowRight } from 'lucide-react';
import '../index.css';

export default function RoboAdvisor() {
  const [universe, setUniverse] = useState([]);
  const [capital, setCapital] = useState(100000);
  const [horizon, setHorizon] = useState('Medium (3-5 Years)');
  const [riskTolerance, setRiskTolerance] = useState('Moderate');
  const [loading, setLoading] = useState(false);
  const [basket, setBasket] = useState(null);
  const [tradeExecuted, setTradeExecuted] = useState(false);
  const [cashBalance, setCashBalance] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const uRes = await fetch('/api/universe');
        const uData = await uRes.json();
        setUniverse(uData.universe);

        const token = localStorage.getItem('quant_token');
        if (token) {
          const hRes = await fetch('/api/portfolio/holdings', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const hData = await hRes.json();
          setCashBalance(hData.stats?.cash_balance || 0);
        }
      } catch(err) {
        console.error("Data fetch failed:", err);
      }
    };
    fetchData();
  }, []);

  const generateBasket = async () => {
    setLoading(true);
    setTradeExecuted(false);
    const randomStocks = [...universe].sort(() => 0.5 - Math.random()).slice(0, 15);
    const tickers = randomStocks.map(s => s.ticker).join(',');
    try {
      const res = await fetch(`/api/scan/bulk?tickers=${tickers}`);
      const data = await res.json();
      const top5 = data.data.slice(0, 5);
      const curated = top5.map(stock => ({
        ...stock,
        weight: 20,
        allocated: capital / 5,
      }));
      setBasket(curated);
    } catch (err) {
      alert("Engine disconnected. Check your backend terminal.");
    } finally {
      setLoading(false);
    }
  };

  const executeTrade = async () => { 
    setLoading(true);
    try {
      const token = localStorage.getItem('quant_token');
      const res = await fetch('/api/portfolio/trade', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ basket })
      });
      if (!res.ok) throw new Error("Failed to execute trade");
      setTradeExecuted(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const riskOptions = [
    { key: 'Conservative', icon: <ShieldCheck size={18} />, desc: 'Lower risk, stable returns', color: 'var(--success)' },
    { key: 'Moderate', icon: <Scale size={18} />, desc: 'Balanced risk-reward', color: 'var(--warning)' },
    { key: 'Aggressive', icon: <Flame size={18} />, desc: 'Higher risk, growth focus', color: 'var(--danger)' },
  ];

  const getRiskColor = (risk) => {
    if (risk > 70) return { bg: 'var(--danger-muted)', color: 'var(--danger)', border: 'rgba(239,68,68,0.2)' };
    if (risk > 40) return { bg: 'var(--warning-muted)', color: 'var(--warning)', border: 'rgba(234,179,8,0.2)' };
    return { bg: 'var(--success-muted)', color: 'var(--success)', border: 'rgba(34,197,94,0.2)' };
  };

  const fmtINR = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  return (
    <div style={{ maxWidth: '960px' }}>
      {/* Header */}
      <div className="fade-up" style={{ marginBottom: '28px' }}>
        <h1 style={{ marginBottom: '4px' }}>Robo-Advisor</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
          Configure parameters and let the engine curate your optimal portfolio.
        </p>
      </div>

      {/* ── Parameters Card ── */}
      <div className="card fade-up" style={{ marginBottom: '24px', animationDelay: '0.08s' }}>
        <h2 style={{ fontSize: '0.95rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={15} style={{ color: 'var(--accent-light)' }} />
          Investment Parameters
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          {/* Capital */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-muted)' }}>
                Capital (₹)
              </label>
              <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: '600' }}>
                Available: {fmtINR(cashBalance)}
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '500' }}>₹</span>
              <input
                type="number" value={capital}
                onChange={(e) => setCapital(Number(e.target.value))}
                style={{ paddingLeft: '30px' }}
              />
            </div>
          </div>
          {/* Horizon */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Time Horizon
            </label>
            <select value={horizon} onChange={(e) => setHorizon(e.target.value)}>
              <option>Short (1-2 Years)</option>
              <option>Medium (3-5 Years)</option>
              <option>Long (5+ Years)</option>
            </select>
          </div>
        </div>

        {/* Risk Tolerance */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-muted)', marginBottom: '10px' }}>
            Risk Tolerance
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {riskOptions.map((opt) => {
              const active = riskTolerance === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setRiskTolerance(opt.key)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                    padding: '16px 12px', borderRadius: '12px',
                    background: active ? 'var(--bg-elevated)' : 'var(--bg-root)',
                    border: active ? `1px solid ${opt.color}` : '1px solid var(--border-default)',
                    transition: 'all 0.2s ease',
                    boxShadow: active ? `0 0 15px ${opt.color}20` : 'none',
                  }}
                >
                  <span style={{ color: active ? opt.color : 'var(--text-muted)', transition: 'color 0.2s' }}>
                    {opt.icon}
                  </span>
                  <span style={{ fontWeight: '600', fontSize: '0.85rem', color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {opt.key}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {opt.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={generateBasket}
          disabled={loading || universe.length === 0}
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite' }}></span>
              Running Models…
            </span>
          ) : (
            <><Sparkles size={15} /> Generate Portfolio</>
          )}
        </button>
      </div>

      {/* ── Results ── */}
      {basket && !tradeExecuted && (
        <div className="fade-up" style={{ animationDelay: '0.1s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={16} style={{ color: 'var(--text-muted)' }} /> Optimized Basket
            </h2>
            <span className="badge badge-success">
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }}></span>
              Ready
            </span>
          </div>
          <div className="table-container" style={{ marginBottom: '16px' }}>
            <table>
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Risk Score</th>
                  <th>Weight</th>
                  <th style={{ textAlign: 'right' }}>Allocation</th>
                </tr>
              </thead>
              <tbody>
                {basket.map((s) => {
                  const rc = getRiskColor(s.Risk);
                  return (
                    <tr key={s.Ticker}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '8px',
                            background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-secondary)',
                          }}>
                            {s.Ticker.slice(0, 3)}
                          </div>
                          <span style={{ fontWeight: '600' }}>{s.Ticker}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
                          borderRadius: '9999px', fontSize: '0.8rem', fontWeight: '600',
                          background: rc.bg, color: rc.color, border: `1px solid ${rc.border}`,
                        }}>{s.Risk}</span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{s.weight}%</td>
                      <td style={{ textAlign: 'right', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {fmtINR(s.allocated)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button className="btn-success" onClick={executeTrade}>
            <CheckCircle size={15} /> Execute Paper Trade
          </button>
        </div>
      )}

      {/* ── Success State ── */}
      {tradeExecuted && (
        <div className="card fade-up" style={{ textAlign: 'center', padding: '50px 20px', border: '1px solid rgba(34,197,94,0.2)' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'var(--success-muted)', border: '1px solid rgba(34,197,94,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <CheckCircle size={28} color="var(--success)" />
          </div>
          <h2 style={{ marginBottom: '6px' }}>Trade Executed</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Assets have been added to your simulated portfolio.
          </p>
        </div>
      )}

      {/* Empty State */}
      {!basket && !loading && (
        <div className="card fade-up" style={{ textAlign: 'center', padding: '50px 20px', animationDelay: '0.15s' }}>
          <Cpu size={32} style={{ color: 'var(--text-muted)', marginBottom: '14px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Configure your preferences and generate a portfolio above.
          </p>
        </div>
      )}
    </div>
  );
}

function Cpu(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={props.style}>
      <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
      <rect x="9" y="9" width="6" height="6"></rect>
      <line x1="9" y1="1" x2="9" y2="4"></line>
      <line x1="15" y1="1" x2="15" y2="4"></line>
      <line x1="9" y1="20" x2="9" y2="23"></line>
      <line x1="15" y1="20" x2="15" y2="23"></line>
      <line x1="20" y1="9" x2="23" y2="9"></line>
      <line x1="20" y1="14" x2="23" y2="14"></line>
      <line x1="1" y1="9" x2="4" y2="9"></line>
      <line x1="1" y1="14" x2="4" y2="14"></line>
    </svg>
  );
}