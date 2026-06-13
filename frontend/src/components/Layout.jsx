import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { PieChart, Activity, Cpu, LogOut, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import '../index.css';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { name: 'Portfolio', path: '/portfolio', icon: <PieChart size={18} /> },
    { name: 'Market Scanner', path: '/market', icon: <Activity size={18} /> },
    { name: 'Robo-Advisor', path: '/advisor', icon: <Cpu size={18} /> },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-root)' }}>
      
      {/* ── Sidebar ── */}
      <aside style={{
        width: collapsed ? '72px' : '240px', 
        minWidth: collapsed ? '72px' : '240px',
        background: 'var(--bg-root)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex', flexDirection: 'column',
        transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
        position: 'relative'
      }}>
        {/* Toggle Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            position: 'absolute', right: '-12px', top: '28px',
            width: '24px', height: '24px', borderRadius: '50%',
            background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)', cursor: 'pointer', zIndex: 10,
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Logo */}
        <div style={{ 
          padding: collapsed ? '24px 0 20px' : '24px 20px 20px', 
          display: 'flex', alignItems: 'center', gap: '10px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          transition: 'all 0.3s ease'
        }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '9px', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TrendingUp size={16} color="#fff" />
          </div>
          {!collapsed && (
            <span className="fade-in" style={{ fontSize: '1.05rem', fontWeight: '700', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
              QuantEngine
            </span>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              title={collapsed ? item.name : undefined}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: collapsed ? '12px' : '10px 14px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '0.9rem', fontWeight: isActive ? '600' : '500',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: isActive ? 'var(--bg-elevated)' : 'transparent',
                transition: 'all 0.15s ease',
              })}
            >
              <span style={{ display: 'flex', color: 'inherit' }}>{item.icon}</span>
              {!collapsed && <span className="fade-in" style={{ whiteSpace: 'nowrap' }}>{item.name}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'center' }}>
          <button
            className="btn-secondary"
            title={collapsed ? "Sign out" : undefined}
            style={{ 
              fontSize: '0.85rem', padding: collapsed ? '10px' : '10px 14px',
              width: collapsed ? 'auto' : '100%',
              display: 'flex', justifyContent: 'center'
            }}
            onClick={() => { localStorage.removeItem('quant_token'); window.location.href = '/'; }}
          >
            <LogOut size={16} /> {!collapsed && <span className="fade-in" style={{ marginLeft: '8px', whiteSpace: 'nowrap' }}>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-content">
        <div className="main-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}