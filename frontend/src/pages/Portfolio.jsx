import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Wallet, IndianRupee, BarChart3, PieChart, Activity, ChevronDown } from 'lucide-react';
import CandlestickChart from '../components/CandlestickChart';
import '../index.css';

export default function Portfolio() {
  const [data, setData] = useState({
    holdings: [],
    stats: { invested: 0, current: 0, returns: 0, returnsPct: 0, cash_balance: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Chart state
  const [expandedRow, setExpandedRow] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [timeframe, setTimeframe] = useState('6mo');
  const [chartType, setChartType] = useState('Candle');

  useEffect(() => {
    const fetchHoldings = async () => {
      try {
        const token = localStorage.getItem('quant_token');
        if (!token) throw new Error("No authentication token found. Please log in.");
        
        const res = await fetch('/api/portfolio/holdings', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.detail || "Failed to fetch portfolio data");
        }
        
        const json = await res.json();
        setData({ holdings: json.holdings, stats: json.stats });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHoldings();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('quant_token');
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws/portfolio?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'price_update' && msg.prices) {
          setData(prev => {
            const newHoldings = prev.holdings.map(h => {
              if (msg.prices[h.ticker]) {
                const newLtp = msg.prices[h.ticker];
                const newPnl = (newLtp - h.avgPrice) * h.shares;
                const newPnlPct = h.avgPrice > 0 ? ((newLtp / h.avgPrice) - 1) * 100 : 0;
                return { ...h, ltp: newLtp, pnl: newPnl, pnlPct: newPnlPct };
              }
              return h;
            });
            
            // Recalculate stats
            let newCurrent = 0;
            newHoldings.forEach(h => newCurrent += (h.ltp * h.shares));
            const newReturns = newCurrent - prev.stats.invested;
            const newReturnsPct = prev.stats.invested > 0 ? (newReturns / prev.stats.invested) * 100 : 0;
            
            return {
              holdings: newHoldings,
              stats: { ...prev.stats, current: newCurrent, returns: newReturns, returnsPct: newReturnsPct }
            };
          });
        }
      } catch (e) {
        console.error("WS parse error", e);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  const handleSell = async (ticker, maxShares, e) => {
    e.stopPropagation();
    const qtyStr = window.prompt(`How many shares of ${ticker} would you like to sell? (Max: ${maxShares})`, maxShares);
    if (!qtyStr) return;
    
    const qty = parseInt(qtyStr);
    if (isNaN(qty) || qty <= 0 || qty > maxShares) {
      alert("Invalid quantity.");
      return;
    }
    
    try {
      const token = localStorage.getItem('quant_token');
      const res = await fetch('/api/portfolio/sell', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ ticker, shares: qty })
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Failed to sell shares");
      
      alert(json.message);
      window.location.reload();
    } catch (err) {
      alert(err.message);
    }
  };

  useEffect(() => {
    if (expandedRow === null) return;
    const ticker = data.holdings[expandedRow].ticker;
    const fetchHistory = async () => {
      setChartLoading(true);
      try {
        const res = await fetch(`/api/scan/history/${ticker}?period=${timeframe}`);
        const json = await res.json();
        if (json.status === "success") {
          setChartData(json.data);
        } else {
          setChartData([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setChartLoading(false);
      }
    };
    fetchHistory();
  }, [expandedRow, timeframe]); // REMOVED data.holdings to prevent reload bug

  const toggleRow = (index) => {
    if (expandedRow === index) {
      setExpandedRow(null);
    } else {
      setExpandedRow(index);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
          <span style={{ width: '18px', height: '18px', border: '2px solid var(--border-strong)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}></span>
          Loading Portfolio...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center', padding: '40px' }}>
        <Activity size={32} style={{ color: 'var(--danger)', marginBottom: '16px' }} />
        <h3>Failed to load portfolio</h3>
        <p style={{ color: 'var(--text-muted)' }}>{error}</p>
      </div>
    );
  }

  const { holdings, stats } = data;

  return (
    <div style={{ maxWidth: '1200px' }}>
      {/* Header */}
      <div className="fade-up" style={{ marginBottom: '32px' }}>
        <h1 style={{ marginBottom: '4px' }}>Portfolio</h1>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
          Your holdings and performance overview.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid-cols-4" style={{ marginBottom: '32px' }}>
        {[
          { label: 'Cash Balance', value: fmt(stats.cash_balance || 0), icon: <Wallet size={16} />, color: 'var(--success)' },
          { label: 'Current Value', value: fmt(stats.current), icon: <TrendingUp size={16} />, color: 'var(--accent)' },
          { label: 'Invested', value: fmt(stats.invested), icon: <IndianRupee size={16} />, color: 'var(--text-muted)' },
          { label: 'Total Returns', value: fmt(stats.returns), icon: <BarChart3 size={16} />, color: stats.returns >= 0 ? 'var(--success)' : 'var(--danger)', pct: stats.returnsPct },
        ].map((s, i) => (
          <div key={i} className="card fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>{s.label}</span>
              <span style={{ color: s.color, opacity: 0.8 }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '700', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              {s.value}
            </div>
            {s.pct !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                <span className={`badge ${s.pct >= 0 ? 'badge-success' : 'badge-danger'}`}>
                  {s.pct >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {Math.abs(s.pct).toFixed(2)}%
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>all time</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Main Content Grid: Holdings (Left) & Allocation (Right) */}
      {holdings.length > 0 ? (
        <div className="grid-cols-2-1">
          
          {/* LEFT: Holdings Table */}
          <div className="fade-up" style={{ animationDelay: '0.2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet size={16} style={{ color: 'var(--text-muted)' }} /> Holdings
              </h2>
              <span className="badge badge-accent">{holdings.length} assets</span>
            </div>
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table style={{ minWidth: '600px' }}>
                <thead>
                  <tr>
                    <th>Stock</th>
                    <th>Shares</th>
                    <th>Avg. Price</th>
                    <th>LTP</th>
                    <th style={{ textAlign: 'right' }}>P&L</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h, i) => (
                    <React.Fragment key={i}>
                    <tr 
                      style={{ cursor: 'pointer', background: expandedRow === i ? 'rgba(255,255,255,0.03)' : 'transparent' }}
                      onClick={() => toggleRow(i)}
                      onMouseOver={(e) => e.currentTarget.style.background = expandedRow === i ? 'rgba(255,255,255,0.03)' : 'var(--bg-hover)'}
                      onMouseOut={(e) => e.currentTarget.style.background = expandedRow === i ? 'rgba(255,255,255,0.03)' : 'transparent'}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <ChevronDown size={16} style={{ color: 'var(--text-muted)', transform: expandedRow === i ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '8px',
                            background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-secondary)',
                            letterSpacing: '0.02em',
                          }}>
                            {h.ticker.slice(0, 3)}
                          </div>
                          <span style={{ fontWeight: '600' }}>{h.ticker}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{h.shares}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{fmt(h.avgPrice)}</td>
                      <td style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>{fmt(h.ltp)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          <span style={{ fontWeight: '600', color: h.pnl >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                            {h.pnl >= 0 ? '+' : ''}{fmt(h.pnl)}
                          </span>
                          <span className={`badge ${h.pnl >= 0 ? 'badge-success' : 'badge-danger'}`}>
                            {h.pnl >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                            {Math.abs(h.pnlPct).toFixed(2)}%
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '6px 12px', fontSize: '0.75rem', borderColor: 'var(--danger-muted)', color: 'var(--danger)' }}
                          onClick={(e) => handleSell(h.ticker, h.shares, e)}
                        >
                          Sell
                        </button>
                      </td>
                    </tr>
                    {expandedRow === i && (
                      <tr>
                        <td colSpan="6" style={{ padding: '0', background: 'rgba(0,0,0,0.2)' }}>
                          <div style={{ padding: '24px', borderTop: '1px solid var(--border-subtle)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                {['1D', '1WK', '6MO', '1Y', '5Y', 'ALL'].map(tf => (
                                  <button
                                    key={tf}
                                    onClick={() => setTimeframe(tf.toLowerCase())}
                                    className={timeframe === tf.toLowerCase() ? 'btn-primary' : 'btn-secondary'}
                                    style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                                  >
                                    {tf}
                                  </button>
                                ))}
                              </div>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => setChartType('Candle')} className={chartType === 'Candle' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '4px 12px', fontSize: '0.75rem' }}>🕯 Candle</button>
                                <button onClick={() => setChartType('Line')} className={chartType === 'Line' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '4px 12px', fontSize: '0.75rem' }}>📈 Line</button>
                              </div>
                            </div>
                            
                            {chartLoading ? (
                              <div style={{ height: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
                                <span style={{ width: '20px', height: '20px', border: '2px solid var(--border-subtle)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}></span>
                              </div>
                            ) : chartData.length > 0 ? (
                              <CandlestickChart data={chartData} type={chartType} height={400} livePrice={h.ltp} />
                            ) : (
                              <div style={{ height: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
                                No historical data found
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT: Asset Allocation */}
          <div className="fade-up" style={{ animationDelay: '0.3s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <PieChart size={16} style={{ color: 'var(--text-muted)' }} />
              <h2>Allocation</h2>
            </div>
            <div className="card" style={{ padding: '24px' }}>
              {/* Allocation Bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {holdings.sort((a,b) => (b.shares * b.ltp) - (a.shares * a.ltp)).map((h, i) => {
                  const val = h.shares * h.ltp;
                  const pct = ((val / stats.current) * 100).toFixed(1);
                  // Generate some nice colors based on index
                  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6'];
                  const color = colors[i % colors.length];
                  
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{h.ticker}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{pct}%</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '3px' }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
        </div>
      ) : (
        <div className="card fade-up" style={{ textAlign: 'center', padding: '60px 20px', animationDelay: '0.2s' }}>
          <Activity size={32} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h3>No Holdings Yet</h3>
          <p style={{ color: 'var(--text-muted)' }}>
            Use the Robo-Advisor or Market Scanner to find and paper-trade assets.
          </p>
        </div>
      )}
    </div>
  );
}