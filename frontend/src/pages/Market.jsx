import React, { useState, useEffect } from 'react';
import { Search, Activity, Filter, AlertCircle } from 'lucide-react';

export default function Market() {
  const [universe, setUniverse] = useState([]);
  const [scanResults, setScanResults] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [selectedSector, setSelectedSector] = useState('All');
  const [error, setError] = useState(null);

  // 1. Fetch Universe on Mount
  useEffect(() => {
    fetch('http://localhost:8000/api/universe')
      .then(res => res.json())
      .then(data => setUniverse(data.universe))
      .catch(err => {
        console.error(err);
        setError("Could not connect to the Quant Engine database.");
      });
  }, []);

  // 2. Execute the Vectorized Scan
  const runMarketScan = async () => {
    setScanning(true);
    setError(null);
    
    // Filter by sector, limit to 15 to keep the UI snappy for the MVP
    const filtered = selectedSector === 'All' 
      ? universe 
      : universe.filter(s => s.industry === selectedSector);
    
    const tickers = filtered.slice(0, 15).map(s => s.ticker).join(',');

    try {
      const res = await fetch(`http://localhost:8000/api/scan/bulk?tickers=${tickers}`);
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

  // Extract unique industries for the dropdown
  const industries = ['All', ...new Set(universe.map(item => item.industry))];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <header style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity size={28} color="#00D09C" /> Deep Market Scanner
        </h1>
        <p style={{ color: '#828F9E' }}>Run vectorized risk analysis across the NIFTY 500 universe.</p>
      </header>

      {error && (
        <div style={{ backgroundColor: 'rgba(229, 57, 53, 0.1)', border: '1px solid #E53935', color: '#E53935', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {/* --- CONTROL PANEL --- */}
      <div style={{ backgroundColor: '#121620', padding: '24px', borderRadius: '12px', border: '1px solid #1E232E', marginBottom: '30px', display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
        
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#828F9E', marginBottom: '8px', letterSpacing: '0.5px' }}>
            <Filter size={12} style={{ marginRight: '4px' }}/> FILTER BY SECTOR
          </label>
          <select 
            value={selectedSector} 
            onChange={(e) => setSelectedSector(e.target.value)}
            style={{ width: '100%', backgroundColor: '#1E232E', color: '#fff', border: '1px solid #2A3143', padding: '14px', borderRadius: '8px', outline: 'none', cursor: 'pointer' }}
          >
            {industries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
          </select>
        </div>

        <button 
          onClick={runMarketScan} 
          disabled={scanning || universe.length === 0}
          style={{ 
            backgroundColor: '#00D09C', color: '#121620', border: 'none', padding: '14px 30px', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: scanning ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: scanning ? 0.7 : 1, transition: 'opacity 0.2s' 
          }}
        >
          {scanning ? 'Crunching Math...' : <><Search size={18} /> Run Analysis</>}
        </button>
      </div>

      {/* --- RESULTS TABLE --- */}
      {scanResults.length > 0 && (
        <div style={{ backgroundColor: '#121620', borderRadius: '12px', border: '1px solid #1E232E', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#0B0E14', color: '#828F9E', fontSize: '0.8rem' }}>
                <th style={{ padding: '16px 24px' }}>TICKER</th>
                <th style={{ padding: '16px 24px' }}>PRICE RISK (VOL & DD)</th>
                <th style={{ padding: '16px 24px' }}>FUNDAMENTAL RISK (D/E)</th>
                <th style={{ padding: '16px 24px', textAlign: 'right' }}>MASTER RISK INDEX</th>
              </tr>
            </thead>
            <tbody>
              {scanResults.map((stock, i) => (
                <tr key={stock.Ticker} style={{ borderBottom: i === scanResults.length - 1 ? 'none' : '1px solid #1E232E' }}>
                  <td style={{ padding: '16px 24px', fontWeight: 'bold', color: '#fff' }}>{stock.Ticker}</td>
                  <td style={{ padding: '16px 24px', color: '#828F9E' }}>{stock.Price_Risk}%</td>
                  <td style={{ padding: '16px 24px', color: '#828F9E' }}>{stock.Fund_Risk}%</td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <span style={getRiskBadge(stock.Risk)}>
                      {stock.Risk}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Helper function for the Risk Traffic Light system
const getRiskBadge = (risk) => {
  const isHigh = risk > 70;
  const isMed = risk > 40;
  
  return {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    backgroundColor: isHigh ? 'rgba(229, 57, 53, 0.1)' : isMed ? 'rgba(255, 179, 0, 0.1)' : 'rgba(0, 208, 156, 0.1)',
    color: isHigh ? '#E53935' : isMed ? '#FFB300' : '#00D09C',
    border: `1px solid ${isHigh ? 'rgba(229, 57, 53, 0.3)' : isMed ? 'rgba(255, 179, 0, 0.3)' : 'rgba(0, 208, 156, 0.3)'}`
  };
};