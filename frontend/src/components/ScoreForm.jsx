import React, { useState } from 'react'
import { submitScore } from '../api/client.js'
import { SCORE_CATEGORIES } from '../utils/constants.js'

const styles = {
  card: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '20px',
    marginTop: '20px',
  },
  heading: {
    fontSize: '15px',
    fontWeight: 600,
    marginBottom: '16px',
    color: 'var(--text-primary)',
  },
  field: { marginBottom: '14px' },
  label: {
    display: 'block',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  select: { width: '100%' },
  stars: { display: 'flex', gap: '8px', marginTop: '4px' },
  starBtn: {
    width: '36px',
    height: '36px',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    background: 'var(--bg-elevated)',
    color: 'var(--text-secondary)',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
  },
  textarea: { width: '100%', minHeight: '80px', resize: 'vertical' },
  submitBtn: {
    background: 'var(--accent)',
    color: '#0f1117',
    border: 'none',
    padding: '9px 20px',
    borderRadius: 'var(--radius)',
    fontWeight: 600,
    fontSize: '14px',
    transition: 'background 0.15s',
  },
  error: { color: 'var(--danger)', fontSize: '13px', marginTop: '8px' },
}

export default function ScoreForm({ candidateId, onSuccess }) {
  const [category, setCategory] = useState('Technical')
  const [score, setScore] = useState(0)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!score) { setError('Please select a score (1-5)'); return }
    setSubmitting(true)
    setError('')
    try {
      await submitScore(candidateId, { category, score, note: note || undefined })
      setScore(0)
      setNote('')
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit score')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={styles.card}>
      <div style={styles.heading}>Submit Score</div>
      <form onSubmit={handleSubmit}>
        <div style={styles.field}>
          <label style={styles.label}>Category</label>
          <select style={styles.select} value={category} onChange={e => setCategory(e.target.value)}>
            {SCORE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Score</label>
          <div style={styles.stars}>
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                style={{
                  ...styles.starBtn,
                  background: score >= n ? 'var(--accent)' : 'var(--bg-elevated)',
                  color: score >= n ? '#0f1117' : 'var(--text-secondary)',
                  borderColor: score >= n ? 'var(--accent)' : 'var(--border)',
                }}
                onClick={() => setScore(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Note (optional)</label>
          <textarea
            style={styles.textarea}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a note..."
          />
        </div>
        {error && <div style={styles.error}>{error}</div>}
        <button style={styles.submitBtn} type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Score'}
        </button>
      </form>
    </div>
  )
}
