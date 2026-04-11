import React from 'react';
import { ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';

export default function Portfolio() {
  // MOCK DATA: Later, we will fetch this from your SQLite database
  const stats = {
    invested: 150000,
    current: 168450,
    returns: 18450,
    returnsPct: 12.3
  };

  const holdings = [
    { ticker: 'RELIANCE', shares: 10, avgPrice: 2450, ltp: 2650, pnl: 2000, pnlPct: 8.1 },
    { ticker: 'TCS', shares: 5, avgPrice: 3500, ltp: 3800, pnl: 1500, pnlPct: 8.5 },
    { ticker: 'ZOMATO', shares: 100, avgPrice: 120, ltp: 165, pnl: 4500, pnlPct: 37.5 },
    { ticker: 'HDFCBANK', shares: 15, avgPrice: 1600, ltp: 1550, pnl: -750, pnlPct: -3.1 },
  ];

  const formatINR = (num) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(num);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '30px' }}>Portfolio Overview</h1>

      {/* TOP STATS CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
        <StatCard title="Current Value" value={formatINR(stats.current)} />
        <StatCard title="Total Investment" value={formatINR(stats.invested)} />
        <StatCard 
          title="Total Returns" 
          value={`${formatINR(stats.returns)}`} 
          subtitle={`${stats.returnsPct}%`}
          isPositive={stats.returns > 0} 
        />
      </div>

      {/* HOLDINGS TABLE */}
      <div style={{ backgroundColor: '#121620', borderRadius: '12px', border: '1px solid #1E232E', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #1E232E' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Wallet size={20} color="#00D09C" /> Your Assets
          </h2>
        </div>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#0B0E14', color: '#828F9E', fontSize: '0.8rem' }}>
              <th style={{ padding: '16px 24px' }}>COMPANY</th>
              <th style={{ padding: '16px 24px' }}>SHARES</th>
              <th style={{ padding: '16px 24px' }}>AVG. PRICE</th>
              <th style={{ padding: '16px 24px' }}>LTP</th>
              <th style={{ padding: '16px 24px', textAlign: 'right' }}>OVERALL RETURNS</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #1E232E' }}>
                <td style={{ padding: '16px 24px', fontWeight: 'bold' }}>{h.ticker}</td>
                <td style={{ padding: '16px 24px', color: '#E2E8F0' }}>{h.shares}</td>
                <td style={{ padding: '16px 24px', color: '#828F9E' }}>{formatINR(h.avgPrice)}</td>
                <td style={{ padding: '16px 24px', color: '#E2E8F0' }}>{formatINR(h.ltp)}</td>
                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                  <div style={{ color: h.pnl > 0 ? '#00D09C' : '#E53935', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px' }}>
                    {h.pnl > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    {formatINR(Math.abs(h.pnl))} ({h.pnlPct}%)
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Helper Component for the top cards
function StatCard({ title, value, subtitle, isPositive }) {
  return (
    <div style={{ backgroundColor: '#121620', padding: '24px', borderRadius: '12px', border: '1px solid #1E232E' }}>
      <p style={{ margin: '0 0 10px 0', color: '#828F9E', fontSize: '0.9rem', fontWeight: '600' }}>{title}</p>
      <h3 style={{ margin: 0, fontSize: '1.8rem', color: '#fff' }}>{value}</h3>
      {subtitle && (
        <p style={{ margin: '8px 0 0 0', color: isPositive ? '#00D09C' : '#E53935', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          {subtitle}
        </p>
      )}
    </div>
  );
}