import React, { useState, useEffect } from 'react';
import { User, Mail, Calendar, Wallet, CheckCircle, AlertCircle, Edit3, Save, X, Shield } from 'lucide-react';
import '../index.css';

export default function Account() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('quant_token');
      if (!token) throw new Error("Please log in to view your account details.");
      
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error("Failed to load profile data.");
      
      const data = await res.json();
      setProfile(data);
      setEditName(data.name || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg('');
    try {
      const token = localStorage.getItem('quant_token');
      const res = await fetch('/api/auth/update', {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: editName })
      });
      
      if (!res.ok) throw new Error("Failed to update profile.");
      
      setProfile({ ...profile, name: editName });
      setIsEditing(false);
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
          <span style={{ width: '18px', height: '18px', border: '2px solid var(--border-strong)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}></span>
          Loading Account...
        </span>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center', padding: '40px' }}>
        <AlertCircle size={32} style={{ color: 'var(--danger)', marginBottom: '16px' }} />
        <h3>Failed to load account</h3>
        <p style={{ color: 'var(--text-muted)' }}>{error}</p>
      </div>
    );
  }

  const joinDate = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  }) : 'Unknown';

  const initials = profile?.name 
    ? profile.name.charAt(0).toUpperCase() 
    : (profile?.email ? profile.email.charAt(0).toUpperCase() : 'U');

  return (
    <div style={{ maxWidth: '900px' }}>
      {/* Header */}
      <div className="fade-up" style={{ marginBottom: '32px' }}>
        <h1 style={{ marginBottom: '4px' }}>Account</h1>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
          Manage your profile and account settings.
        </p>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="fade-in" style={{
          padding: '14px 20px', borderRadius: '12px', marginBottom: '20px',
          background: 'var(--success-muted)', border: '1px solid rgba(34, 197, 94, 0.2)',
          display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--success)'
        }}>
          <CheckCircle size={16} />
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{successMsg}</span>
        </div>
      )}

      {error && profile && (
        <div className="fade-in" style={{
          padding: '14px 20px', borderRadius: '12px', marginBottom: '20px',
          background: 'var(--danger-muted)', border: '1px solid rgba(239, 68, 68, 0.2)',
          display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--danger)'
        }}>
          <AlertCircle size={16} />
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{error}</span>
        </div>
      )}

      {/* Profile Card */}
      <div className="card-glow fade-up" style={{ padding: '32px', marginBottom: '24px', animationDelay: '0.08s' }}>
        <div className="responsive-flex">
          
          {/* Avatar */}
          <div style={{
            width: '80px', height: '80px', borderRadius: '20px', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--accent), #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', fontWeight: 700, color: '#fff',
            boxShadow: '0 8px 32px rgba(99, 102, 241, 0.25)'
          }}>
            {initials}
          </div>

          {/* Profile Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            
            {/* Name Row */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', fontSize: '0.75rem', fontWeight: 600, 
                color: 'var(--text-muted)', textTransform: 'uppercase', 
                letterSpacing: '0.08em', marginBottom: '8px' 
              }}>
                Full Name
              </label>
              
              {isEditing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter your name"
                    autoFocus
                    style={{ maxWidth: '300px' }}
                  />
                  <button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="btn-primary"
                    style={{ width: 'auto', padding: '13px 20px' }}
                  >
                    {saving ? (
                      <span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }}></span>
                    ) : (
                      <Save size={14} />
                    )}
                    Save
                  </button>
                  <button 
                    onClick={() => { setIsEditing(false); setEditName(profile?.name || ''); }} 
                    className="btn-secondary"
                    style={{ width: 'auto', padding: '11px 16px' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {profile?.name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: 400 }}>Not set</span>}
                  </span>
                  <button 
                    onClick={() => setIsEditing(true)}
                    style={{
                      background: 'var(--bg-hover)', border: '1px solid var(--border-default)',
                      borderRadius: '8px', padding: '6px 8px', cursor: 'pointer',
                      color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.color = 'var(--accent-light)'; }}
                    onMouseLeave={e => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.color = 'var(--text-secondary)'; }}
                  >
                    <Edit3 size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* Email Row */}
            <div>
              <label style={{ 
                display: 'block', fontSize: '0.75rem', fontWeight: 600, 
                color: 'var(--text-muted)', textTransform: 'uppercase', 
                letterSpacing: '0.08em', marginBottom: '8px' 
              }}>
                Email Address
              </label>
              <div style={{ 
                display: 'inline-flex', alignItems: 'center', gap: '10px',
                padding: '10px 16px', borderRadius: '10px',
                background: 'var(--bg-root)', border: '1px solid var(--border-subtle)'
              }}>
                <Mail size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>{profile?.email}</span>
                <span style={{
                  padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600,
                  background: 'var(--success-muted)', color: 'var(--success)',
                  textTransform: 'uppercase', letterSpacing: '0.04em'
                }}>
                  Verified
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid-cols-3">
        <div className="card fade-up" style={{ animationDelay: '0.16s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Member Since</span>
            <span style={{ color: 'var(--accent)', opacity: 0.8 }}><Calendar size={16} /></span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            {joinDate}
          </div>
        </div>

        <div className="card fade-up" style={{ animationDelay: '0.24s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Available Cash</span>
            <span style={{ color: 'var(--success)', opacity: 0.8 }}><Wallet size={16} /></span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            ₹{profile?.cash_balance ? Number(profile.cash_balance).toLocaleString('en-IN') : '0.00'}
          </div>
        </div>

        <div className="card fade-up" style={{ animationDelay: '0.32s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Account Status</span>
            <span style={{ color: 'var(--success)', opacity: 0.8 }}><Shield size={16} /></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)',
              boxShadow: '0 0 8px var(--success)', display: 'inline-block'
            }}></span>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--success)' }}>
              Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
