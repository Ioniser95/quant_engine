import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { PieChart, Activity, Cpu, LogOut, TrendingUp } from 'lucide-react';

export default function Layout() {
  const navItems = [
    { name: 'My Portfolio', path: '/portfolio', icon: <PieChart size={20} /> },
    { name: 'Market Scanner', path: '/market', icon: <Activity size={20} /> },
    { name: 'Robo-Advisor', path: '/advisor', icon: <Cpu size={20} /> },
  ];

  return (
    <div style={styles.container}>
      {/* SIDEBAR */}
      <aside style={styles.sidebar}>
        <div style={styles.logoContainer}>
          <TrendingUp size={24} color="#00D09C" />
          <h2 style={styles.logoText}>Quant<span style={{color: '#fff'}}>Engine</span></h2>
        </div>

        <nav style={styles.nav}>
          {navItems.map((item) => (
            <NavLink 
              key={item.name} 
              to={item.path}
              style={({ isActive }) => ({
                ...styles.navItem,
                backgroundColor: isActive ? '#1E232E' : 'transparent',
                color: isActive ? '#00D09C' : '#828F9E',
                borderRight: isActive ? '3px solid #00D09C' : '3px solid transparent'
              })}
            >
              {item.icon}
              <span style={{ fontWeight: '600' }}>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div style={styles.logoutWrapper}>
          <button style={styles.logoutButton} onClick={() => window.location.href = '/'}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA (This is where the pages load!) */}
      <main style={styles.mainContent}>
        <Outlet /> 
      </main>
    </div>
  );
}

const styles = {
  container: { display: 'flex', minHeight: '100vh', backgroundColor: '#0B0E14', color: '#fff', fontFamily: 'system-ui, sans-serif' },
  sidebar: { width: '260px', backgroundColor: '#121620', borderRight: '1px solid #1E232E', display: 'flex', flexDirection: 'column' },
  logoContainer: { display: 'flex', alignItems: 'center', gap: '10px', padding: '30px 24px', borderBottom: '1px solid #1E232E' },
  logoText: { margin: 0, fontSize: '1.4rem', color: '#00D09C', fontWeight: '800' },
  nav: { display: 'flex', flexDirection: 'column', padding: '20px 0', flex: 1 },
  navItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px', textDecoration: 'none', transition: 'all 0.2s' },
  logoutWrapper: { padding: '20px 24px', borderTop: '1px solid #1E232E' },
  logoutButton: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'transparent', border: 'none', color: '#828F9E', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '600', padding: 0 },
  mainContent: { flex: 1, overflowY: 'auto', padding: '40px' }
};