import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login as apiLogin, register as apiRegister } from '../api/client.js'
import { useAuth } from '../App.jsx'

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-base)',
  },
  card: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '36px 32px',
    width: '380px',
  },
  logo: {
    fontFamily: 'var(--font-mono)',
    color: 'var(--accent)',
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '24px',
    textAlign: 'center',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid var(--border)',
    marginBottom: '24px',
  },
  tab: {
    flex: 1,
    padding: '10px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    transition: 'all 0.15s',
  },
  activeTab: {
    color: 'var(--accent)',
    borderBottom: '2px solid var(--accent)',
  },
  field: { marginBottom: '16px' },
  label: {
    display: 'block',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  input: { width: '100%' },
  submitBtn: {
    width: '100%',
    background: 'var(--accent)',
    color: '#0f1117',
    border: 'none',
    padding: '11px',
    borderRadius: 'var(--radius)',
    fontWeight: 600,
    fontSize: '15px',
    marginTop: '8px',
  },
  error: {
    color: 'var(--danger)',
    fontSize: '13px',
    marginBottom: '12px',
    padding: '8px 12px',
    background: 'rgba(255, 77, 109, 0.1)',
    borderRadius: 'var(--radius)',
  },
  success: {
    color: 'var(--success)',
    fontSize: '13px',
    marginBottom: '12px',
    padding: '8px 12px',
    background: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 'var(--radius)',
  },
}

function decodeTokenRole(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.role || 'reviewer'
  } catch {
    return 'reviewer'
  }
}

export default function Login() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  function switchMode(next) {
    setMode(next)
    setError('')
    setSuccessMsg('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMsg('')
    try {
      if (mode === 'login') {
        const res = await apiLogin(email, password)
        const token = res.data.access_token
        login(token, { email, role: decodeTokenRole(token) })
        navigate('/candidates')
      } else {
        await apiRegister(email, password)
        try {
          const res = await apiLogin(email, password)
          const token = res.data.access_token
          login(token, { email, role: decodeTokenRole(token) })
          navigate('/candidates')
        } catch {
          setSuccessMsg('Registered successfully. Please log in.')
          setMode('login')
        }
      }
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>TechKraft / TalentPulse</div>
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(mode === 'login' ? styles.activeTab : {}) }}
            onClick={() => switchMode('login')}
          >
            Login
          </button>
          <button
            style={{ ...styles.tab, ...(mode === 'register' ? styles.activeTab : {}) }}
            onClick={() => switchMode('register')}
          >
            Register
          </button>
        </div>
        {error && <div style={styles.error}>{error}</div>}
        {successMsg && <div style={styles.success}>{successMsg}</div>}
        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>
          <button style={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? '...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
