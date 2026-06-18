import React, { useState, useEffect } from 'react';
import { Search, Activity, Filter, AlertCircle, TrendingUp, BarChart3, Shield, ChevronDown, ChevronRight } from 'lucide-react';
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

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Chart controls
  const [chartPeriod, setChartPeriod] = useState('3mo');
  const [chartType, setChartType] = useState('candle');

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/scan/search-ticker?query=${searchQuery}`);
        const data = await res.json();
        if (data.status === 'success') {
          setSearchResults(data.results);
          setShowSearchDropdown(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectSearchItem = async (symbol) => {
    setShowSearchDropdown(false);
    setSearchQuery('');
    setScanning(true);
    setError(null);
    try {
      const res = await fetch(`/api/scan/analyze-hybrid?ticker=${symbol}`);
      const data = await res.json();
      if (data.status === 'success') {
        const newStock = data.data[0];
        setScanResults(prev => {
          const filtered = prev.filter(s => s.Ticker !== newStock.Ticker);
          return [newStock, ...filtered];
        });
        handleRowClick(newStock.Ticker, true);
      } else {
        setError(data.message || "Failed to analyze ticker.");
      }
    } catch (err) {
      setError("Backend connection failed.");
    } finally {
      setScanning(false);
    }
  };

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

  const handleRowClick = async (ticker, forceExpand = false) => {
    if (expandedTicker === ticker && !forceExpand) {
      setExpandedTicker(null);
      return;
    }
    
    setExpandedTicker(ticker);
    setLoadingHistory(true);
    setTickerHistoryData([]);
    
    try {
      const res = await fetch(`/api/scan/history/${ticker}?period=${chartPeriod}`);
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

  useEffect(() => {
    if (expandedTicker) {
      handleRowClick(expandedTicker, true);
    }
  }, [chartPeriod]);

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

      {/* Controls & Search */}
      <div className="card fade-up" style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', marginBottom: '28px', animationDelay: '0.08s', position: 'relative', zIndex: 10 }}>
        <div style={{ flex: 2, position: 'relative' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-muted)', marginBottom: '6px' }}>
            Search NSE Stock
          </label>
          <div className="input-group">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="e.g. Reliance, TCS, Zomato..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (searchResults.length > 0) setShowSearchDropdown(true); }}
            />
            {isSearching && <span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--accent)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite', position: 'absolute', right: '14px' }}></span>}
          </div>
          
          {showSearchDropdown && searchResults.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px', marginTop: '4px', zIndex: 50, maxHeight: '250px', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}>
              {searchResults.map((res, i) => (
                <div 
                  key={i} 
                  onClick={() => handleSelectSearchItem(res.symbol)}
                  style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{res.shortname || res.longname}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{res.symbol} &bull; {res.exchange}</div>
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                </div>
              ))}
            </div>
          )}
        </div>
        
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
                            <div style={{ color: 'var(--text-muted)' }}>
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '0 4px' }}>
                              <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-elevated)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                                {['3mo', '6mo', '1y', '5y', 'max'].map(period => (
                                  <button
                                    key={period}
                                    onClick={() => setChartPeriod(period)}
                                    style={{
                                      background: chartPeriod === period ? 'var(--bg-hover)' : 'transparent',
                                      color: chartPeriod === period ? 'var(--text-primary)' : 'var(--text-secondary)',
                                      border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: chartPeriod === period ? '600' : '500'
                                    }}
                                  >
                                    {period === 'max' ? 'ALL' : period.toUpperCase()}
                                  </button>
                                ))}
                              </div>
                              <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-elevated)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                                <button
                                  onClick={() => setChartType('candle')}
                                  style={{
                                    background: chartType === 'candle' ? 'var(--bg-hover)' : 'transparent',
                                    color: chartType === 'candle' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: chartType === 'candle' ? '600' : '500'
                                  }}
                                >
                                  🕯️ Candle
                                </button>
                                <button
                                  onClick={() => setChartType('line')}
                                  style={{
                                    background: chartType === 'line' ? 'var(--bg-hover)' : 'transparent',
                                    color: chartType === 'line' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: chartType === 'line' ? '600' : '500'
                                  }}
                                >
                                  📈 Line
                                </button>
                              </div>
                            </div>
                            
                            {loadingHistory ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-muted)' }}>
                                <span style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite', marginRight: '10px' }}></span>
                                Loading price history...
                              </div>
                            ) : tickerHistoryData.length > 0 ? (
                              <CandlestickChart data={tickerHistoryData} type={chartType} height={300} />
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