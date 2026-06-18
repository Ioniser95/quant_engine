import React, { useState, useEffect } from 'react';
import { Search, Activity, Filter, AlertCircle, TrendingUp, BarChart3, Shield } from 'lucide-react';
import CandlestickChart from '../components/CandlestickChart';
import '../index.css';

export default function Market() {
  const [universe, setUniverse] = useState([]);
  const [scanResults, setScanResults] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [selectedSector, setSelectedSector] = useState('All');
  const [error, setError] = useState(null);
  
  const [expandedTicker, setExpandedTicker] = useState(null);
  const [tickerHistoryData, setTickerHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetch('/api/universe')
      .then(res => res.json())
      .then(data => setUniverse(data.universe))
      .catch(err => {
        console.error(err);
        setError("Could not connect to the Quant Engine database.");
      });
  }, []);

  const runMarketScan = async () => {
    setScanning(true);
    setError(null);
    const filtered = selectedSector === 'All'
      ? universe
      : universe.filter(s => s.industry === selectedSector);
    const tickers = filtered.slice(0, 15).map(s => s.ticker).join(',');

    try {
      const res = await fetch(`/api/scan/bulk?tickers=${tickers}`);
      const data = await res.json();
      if (data.status === 'success') {
        setScanResults(data.data);
      } else {
        setError("Engine returned an error.");
      }
    } catch (err) {
      setError("Backend connection failed. Is main.py running?");
    } finally {
      setScanning(false);
    }
  };

  const handleRowClick = async (ticker) => {
    if (expandedTicker === ticker) {
      setExpandedTicker(null);
      return;
    }
    
    setExpandedTicker(ticker);
    setLoadingHistory(true);
    setTickerHistoryData([]);
    
    try {
      const res = await fetch(`/api/scan/history/${ticker}`);
      const data = await res.json();
      if (data.status === 'success') {
        setTickerHistoryData(data.data);
      }
    } catch (err) {
      console.error("Failed to load chart data", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const industries = ['All', ...new Set(universe.map(item => item.industry))];

  const getRiskColor = (risk) => {
    if (risk > 70) return { bg: 'var(--danger-muted)', color: 'var(--danger)', border: 'rgba(239,68,68,0.2)' };
    if (risk > 40) return { bg: 'var(--warning-muted)', color: 'var(--warning)', border: 'rgba(234,179,8,0.2)' };
    return { bg: 'var(--success-muted)', color: 'var(--success)', border: 'rgba(34,197,94,0.2)' };
  };

  return (
    <div style={{ maxWidth: '960px' }}>
      {/* Header */}
      <div className="fade-up" style={{ marginBottom: '28px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          Market Scanner
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
          Run vectorized risk analysis across the NIFTY 500 universe.
        </p>
      </div>

      {error && (
        <div className="alert-error" style={{ marginBottom: '20px' }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Controls */}
      <div className="card fade-up" style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', marginBottom: '28px', animationDelay: '0.08s' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-muted)', marginBottom: '6px' }}>
            Sector Filter
          </label>
          <select value={selectedSector} onChange={(e) => setSelectedSector(e.target.value)}>
            {industries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
          </select>
        </div>
        <button
          className="btn-primary"
          onClick={runMarketScan}
          disabled={scanning || universe.length === 0}
          style={{ width: 'auto', minWidth: '160px', opacity: scanning ? 0.7 : 1 }}
        >
          {scanning ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite' }}></span>
              Scanning…
            </span>
          ) : (
            <><Search size={15} /> Run Analysis</>
          )}
        </button>
      </div>

      {/* Results */}
      {scanResults.length > 0 && (
        <div className="fade-up" style={{ animationDelay: '0.15s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={16} style={{ color: 'var(--text-muted)' }} /> Results
            </h2>
            <span className="badge badge-accent">{scanResults.length} scanned</span>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Price Risk</th>
                  <th>Fundamental Risk</th>
                  <th style={{ textAlign: 'right' }}>Master Index</th>
                </tr>
              </thead>
              <tbody>
                {scanResults.map((stock) => {
                  const rc = getRiskColor(stock.Risk);
                  const isExpanded = expandedTicker === stock.Ticker;
                  
                  return (
                    <React.Fragment key={stock.Ticker}>
                      <tr 
                        onClick={() => handleRowClick(stock.Ticker)}
                        style={{ cursor: 'pointer', background: isExpanded ? 'var(--bg-hover)' : 'transparent', transition: 'background 0.2s ease' }}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                              {isExpanded ? '▼' : '▶'}
                            </div>
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '8px',
                              background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.02em',
                            }}>
                              {stock.Ticker.slice(0, 3)}
                            </div>
                            <span style={{ fontWeight: '600' }}>{stock.Ticker}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '60px', height: '4px', borderRadius: '2px', background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(stock.Price_Risk, 100)}%`, height: '100%', borderRadius: '2px', background: getRiskColor(stock.Price_Risk).color, transition: 'width 0.5s ease' }}></div>
                            </div>
                            <span style={{ fontSize: '0.8rem' }}>{stock.Price_Risk}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '60px', height: '4px', borderRadius: '2px', background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(stock.Fund_Risk, 100)}%`, height: '100%', borderRadius: '2px', background: getRiskColor(stock.Fund_Risk).color, transition: 'width 0.5s ease' }}></div>
                            </div>
                            <span style={{ fontSize: '0.8rem' }}>{stock.Fund_Risk}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '3px 10px', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: '600',
                            background: rc.bg, color: rc.color, border: `1px solid ${rc.border}`,
                          }}>
                            {stock.Risk}
                          </span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan="4" style={{ padding: '0 24px 24px 24px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-root)' }}>
                            {loadingHistory ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-muted)' }}>
                                <span style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite', marginRight: '10px' }}></span>
                                Loading price history...
                              </div>
                            ) : tickerHistoryData.length > 0 ? (
                              <CandlestickChart data={tickerHistoryData} height={300} />
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-muted)' }}>
                                <AlertCircle size={16} style={{ marginRight: '8px' }} />
                                No historical data available
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {scanResults.length === 0 && !scanning && !error && (
        <div className="card fade-up" style={{ textAlign: 'center', padding: '60px 20px', animationDelay: '0.15s' }}>
          <Activity size={32} style={{ color: 'var(--text-muted)', marginBottom: '14px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Select a sector and run an analysis to see risk scores.
          </p>
        </div>
      )}
    </div>
  );
}