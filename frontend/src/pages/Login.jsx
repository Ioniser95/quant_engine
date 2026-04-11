import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, TrendingUp, AlertCircle } from 'lucide-react';

export default function Login({ onLogin }) {
  const [isLoginView, setIsLoginView] = useState(true); // Toggle between Login and Sign Up
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Determine which Python endpoint to hit based on the toggle
    const endpoint = isLoginView ? '/api/auth/login' : '/api/auth/signup';

    try {
      const res = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        // If Python throws an HTTPException (like wrong password or email taken)
        throw new Error(data.detail || 'Authentication failed.');
      }

      if (isLoginView) {
        // --- SUCCESSFUL LOGIN ---
        // 1. Save the VIP Pass (JWT) to the browser's local storage
        localStorage.setItem('quant_token', data.access_token);
        // 2. Tell App.jsx to let the user into the Dashboard
        onLogin();
      } else {
        // --- SUCCESSFUL SIGNUP ---
        alert("Investor profile created! Please log in.");
        setIsLoginView(true); // Switch them back to the login screen
        setPassword(''); // Clear the password field for safety
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        
        <div style={styles.logoContainer}>
          <div style={styles.iconWrapper}>
            <TrendingUp size={28} color="#00D09C" />
          </div>
          <h1 style={styles.title}>Quant<span style={{color: '#fff'}}>Engine</span></h1>
        </div>

        <p style={styles.subtitle}>
          {isLoginView ? 'Welcome back. Authenticate to access your institutional dashboard.' : 'Create your institutional portfolio account.'}
        </p>

        {/* Error Banner */}
        {error && (
          <div style={{ backgroundColor: 'rgba(229, 57, 53, 0.1)', border: '1px solid #E53935', color: '#E53935', padding: '12px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>EMAIL ADDRESS</label>
            <div style={styles.inputWrapper}>
              <Mail size={18} color="#828F9E" style={styles.inputIcon} />
              <input 
                type="email" 
                placeholder="investor@firm.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>PASSWORD</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} color="#828F9E" style={styles.inputIcon} />
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Processing...' : (isLoginView ? 'Continue Securely' : 'Create Account')} <ArrowRight size={18} />
          </button>
        </form>

        <p style={styles.footerText}>
          {isLoginView ? "Don't have an account? " : "Already have an account? "}
          <span style={styles.link} onClick={() => setIsLoginView(!isLoginView)}>
            {isLoginView ? 'Request Access' : 'Sign In'}
          </span>
        </p>
      </div>
    </div>
  );
}

// --- GROWW-INSPIRED DARK THEME ---
const styles = {
  container: { minHeight: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#121620', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '20px' },
  card: { backgroundColor: '#1E232E', padding: '50px 40px', borderRadius: '16px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', border: '1px solid #2A3143' },
  logoContainer: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' },
  iconWrapper: { backgroundColor: 'rgba(0, 208, 156, 0.1)', padding: '10px', borderRadius: '12px' },
  title: { margin: 0, fontSize: '1.8rem', color: '#00D09C', fontWeight: '800', letterSpacing: '-0.5px' },
  subtitle: { color: '#828F9E', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '25px' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '0.75rem', fontWeight: '700', color: '#828F9E', letterSpacing: '0.5px' },
  inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon: { position: 'absolute', left: '14px' },
  input: { width: '100%', padding: '14px 14px 14px 42px', backgroundColor: '#121620', border: '1px solid #2A3143', borderRadius: '8px', color: '#ffffff', fontSize: '1rem', outline: 'none', boxSizing: 'border-box', transition: 'border 0.2s' },
  button: { marginTop: '10px', backgroundColor: '#00D09C', color: '#121620', border: 'none', padding: '16px', borderRadius: '8px', fontSize: '1.05rem', fontWeight: '700', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'opacity 0.2s' },
  footerText: { textAlign: 'center', color: '#828F9E', fontSize: '0.9rem', marginTop: '30px' },
  link: { color: '#00D09C', cursor: 'pointer', fontWeight: '600' }
};