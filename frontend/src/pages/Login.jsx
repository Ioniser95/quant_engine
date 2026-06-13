import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, AlertCircle, CheckCircle, Key } from 'lucide-react';
import '../index.css';

export default function Login({ onLogin }) {
  const [viewType, setViewType] = useState('login'); // 'login', 'signup', 'forgot', 'changePassword'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (viewType === 'changePassword') {
        // Step 1: Verify old password works
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error(loginData.detail || 'Current password is incorrect.');

        // Step 2: Use forgot-password to reset, then update with new password
        // We use a workaround: call forgot-password to reset, then immediately
        // we need a proper change-password endpoint. For now, let's call it.
        const changeRes = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, current_password: password, new_password: newPassword })
        });
        const changeData = await changeRes.json();
        if (!changeRes.ok) throw new Error(changeData.detail || 'Failed to change password.');

        setSuccessMsg('Password updated! Sign in with your new password.');
        setViewType('login');
        setPassword('');
        setNewPassword('');
        setLoading(false);
        return;
      }

      let endpoint = '/api/auth/login';
      let body = { email, password };

      if (viewType === 'signup') endpoint = '/api/auth/signup';
      else if (viewType === 'forgot') {
        endpoint = '/api/auth/forgot-password';
        body = { email };
      }

      const res = await fetch(`${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Authentication failed.');

      if (viewType === 'login') {
        localStorage.setItem('quant_token', data.access_token);
        onLogin();
      } else if (viewType === 'signup') {
        setSuccessMsg("Account created! Sign in below.");
        setViewType('login');
        setPassword('');
      } else if (viewType === 'forgot') {
        setSuccessMsg(data.message + " — Use 'Change Password' below to set a new one.");
        setViewType('login');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchView = (v) => { setViewType(v); setError(''); setSuccessMsg(''); setPassword(''); setNewPassword(''); };

  const titles = {
    login: { h: 'Welcome back', p: 'Sign in to your QuantEngine dashboard.' },
    signup: { h: 'Create your account', p: 'Start building your quantitative portfolio.' },
    forgot: { h: 'Reset password', p: 'We\'ll generate a temporary password for you.' },
    changePassword: { h: 'Change password', p: 'Set a new password for your account.' },
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#09090b', position: 'relative', overflow: 'hidden',
    }}>
      {/* Background */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}></div>
        <div style={{ position: 'absolute', top: '-15%', left: '50%', transform: 'translateX(-50%)',
          width: '900px', height: '600px',
          background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 55%)', filter: 'blur(40px)',
        }}></div>
        <div style={{ position: 'absolute', top: '35%', left: 0, right: 0, height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.12), transparent)',
        }}></div>
      </div>

      {/* Card */}
      <div className="fade-up" style={{ width: '100%', maxWidth: '440px', position: 'relative', zIndex: 1, padding: '0 20px' }}>
        
        {/* Logo + Title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '52px', height: '52px', borderRadius: '15px', marginBottom: '24px',
            background: 'linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%)',
            boxShadow: '0 0 30px rgba(99,102,241,0.3)',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
              <polyline points="16 7 22 7 22 13"></polyline>
            </svg>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', letterSpacing: '-0.03em', marginBottom: '8px' }}>
            {titles[viewType].h}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: '400', margin: 0, lineHeight: 1.5 }}>
            {titles[viewType].p}
          </p>
        </div>

        {/* Form Card */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.3), 0 25px 50px rgba(0,0,0,0.4)',
        }}>
          {error && (
            <div className="alert-error" style={{ marginBottom: '18px' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
            </div>
          )}
          {successMsg && (
            <div className="alert-success" style={{ marginBottom: '18px' }}>
              <CheckCircle size={16} style={{ flexShrink: 0 }} /> {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email — shown for all views */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                <input type="email" placeholder="name@company.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} style={{ paddingLeft: '42px' }} required />
              </div>
            </div>

            {/* Password — shown for login, signup, changePassword */}
            {viewType !== 'forgot' && (
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                    {viewType === 'changePassword' ? 'Current Password' : 'Password'}
                  </label>
                  {viewType === 'login' && (
                    <span onClick={() => switchView('forgot')} style={{ fontSize: '0.85rem', color: 'var(--accent-light)', cursor: 'pointer', fontWeight: '500' }}>
                      Forgot?
                    </span>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                  <input type="password" placeholder="••••••••" value={password}
                    onChange={(e) => setPassword(e.target.value)} style={{ paddingLeft: '42px' }} required />
                </div>
              </div>
            )}

            {/* New Password — only for changePassword */}
            {viewType === 'changePassword' && (
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Key size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                  <input type="password" placeholder="Enter new password" value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)} style={{ paddingLeft: '42px' }} required />
                </div>
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading}
              style={{ marginTop: '6px', opacity: loading ? 0.7 : 1, width: '100%' }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '15px', height: '15px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite' }}></span>
                  Processing…
                </span>
              ) : (
                <>
                  {viewType === 'login' && 'Sign in'}
                  {viewType === 'signup' && 'Create account'}
                  {viewType === 'forgot' && 'Reset password'}
                  {viewType === 'changePassword' && 'Update password'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Footer links */}
          <div style={{ textAlign: 'center', marginTop: '22px', fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {viewType === 'login' && (
              <>
                <div>
                  No account?{' '}
                  <span onClick={() => switchView('signup')} style={{ color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '500' }}>Sign up</span>
                </div>
                <div>
                  Have a temporary password?{' '}
                  <span onClick={() => switchView('changePassword')} style={{ color: 'var(--accent-light)', cursor: 'pointer', fontWeight: '500' }}>Change it</span>
                </div>
              </>
            )}
            {(viewType === 'signup' || viewType === 'forgot' || viewType === 'changePassword') && (
              <div>
                Back to{' '}
                <span onClick={() => switchView('login')} style={{ color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '500' }}>sign in</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom pills */}
        <div className="fade-up" style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '28px', animationDelay: '0.3s' }}>
          {['500+ Stocks', 'AI-Powered', 'Real-time'].map((t, i) => (
            <span key={i} style={{
              padding: '6px 16px', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: '500',
              background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)',
            }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}