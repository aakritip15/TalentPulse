import React, { useState } from 'react'
import { generateSummary } from '../api/client.js'

const styles = {
  card: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '20px',
    marginTop: '20px',
  },
  heading: { fontSize: '15px', fontWeight: 600, marginBottom: '16px' },
  btn: {
    background: 'var(--accent)',
    color: '#0f1117',
    border: 'none',
    padding: '9px 20px',
    borderRadius: 'var(--radius)',
    fontWeight: 600,
    fontSize: '14px',
  },
  spinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid var(--border)',
    borderTopColor: 'var(--accent)',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    marginRight: '8px',
    verticalAlign: 'middle',
    flexShrink: 0,
  },
  loadingRow: {
    display: 'flex',
    alignItems: 'center',
    color: 'var(--text-secondary)',
    fontSize: '14px',
  },
  summaryBox: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '14px 16px',
    fontSize: '14px',
    lineHeight: 1.7,
    color: 'var(--text-primary)',
  },
  timestamp: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginTop: '8px',
  },
  error: { color: 'var(--danger)', fontSize: '13px', marginBottom: '12px' },
  retryBtn: {
    background: 'transparent',
    border: '1px solid var(--danger)',
    color: 'var(--danger)',
    padding: '6px 14px',
    borderRadius: 'var(--radius)',
    fontSize: '13px',
  },
}

export default function AISummary({ candidateId }) {
  const [state, setState] = useState('idle')
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')

  async function handleGenerate() {
    setState('loading')
    setError('')
    try {
      const res = await generateSummary(candidateId)
      setSummary(res.data)
      setState('success')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate summary')
      setState('error')
    }
  }

  return (
    <div style={styles.card}>
      <div style={styles.heading}>AI Summary</div>

      {state === 'idle' && (
        <button style={styles.btn} onClick={handleGenerate}>
          Generate AI Summary
        </button>
      )}

      {state === 'loading' && (
        <div style={styles.loadingRow}>
          <span style={styles.spinner} />
          Generating AI summary...
        </div>
      )}

      {state === 'success' && summary && (
        <>
          <div style={styles.summaryBox}>{summary.summary}</div>
          <div style={styles.timestamp}>
            Generated at: {new Date(summary.generated_at).toLocaleString()}
          </div>
          <button style={{ ...styles.btn, marginTop: '12px', fontSize: '13px' }} onClick={handleGenerate}>
            Regenerate
          </button>
        </>
      )}

      {state === 'error' && (
        <>
          <div style={styles.error}>{error}</div>
          <button style={styles.retryBtn} onClick={handleGenerate}>
            Retry
          </button>
        </>
      )}
    </div>
  )
}
