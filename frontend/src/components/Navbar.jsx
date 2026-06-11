import React from 'react'
import { useAuth } from '../App.jsx'
import { ROLE_COLORS } from '../utils/constants.js'

const styles = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    height: '56px',
    background: 'var(--bg-surface)',
    borderBottom: '1px solid var(--border)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  logo: {
    fontWeight: 600,
    fontSize: '16px',
    color: 'var(--accent)',
    fontFamily: 'var(--font-mono)',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  email: {
    color: 'var(--text-secondary)',
    fontSize: '13px',
  },
  roleBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    padding: '5px 12px',
    borderRadius: 'var(--radius)',
    fontSize: '13px',
    transition: 'border-color 0.15s, color 0.15s',
  },
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const roleColor = ROLE_COLORS[user?.role] || ROLE_COLORS.reviewer

  return (
    <nav style={styles.nav}>
      <span style={styles.logo}>TechKraft / TalentPulse</span>
      <div style={styles.right}>
        <span style={styles.email}>{user?.email}</span>
        <span
          style={{
            ...styles.roleBadge,
            background: `${roleColor}1a`,
            color: roleColor,
          }}
        >
          {user?.role}
        </span>
        <button style={styles.logoutBtn} onClick={logout}>
          Logout
        </button>
      </div>
    </nav>
  )
}
