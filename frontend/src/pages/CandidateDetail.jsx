import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCandidate, deleteCandidate } from '../api/client.js'
import { useAuth } from '../App.jsx'
import { STATUS_COLORS } from '../utils/constants.js'
import ScoreForm from '../components/ScoreForm.jsx'
import AISummary from '../components/AISummary.jsx'
import InternalNotes from '../components/InternalNotes.jsx'

const styles = {
  page: { padding: '24px', maxWidth: '860px', margin: '0 auto' },
  backBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--accent)',
    fontSize: '14px',
    padding: '0',
    marginBottom: '20px',
    cursor: 'pointer',
  },
  card: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '24px',
  },
  nameRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' },
  name: { fontSize: '22px', fontWeight: 700 },
  badge: { padding: '3px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 },
  meta: { color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' },
  chip: {
    padding: '3px 10px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    fontSize: '13px',
  },
  section: { marginTop: '28px' },
  sectionTitle: { fontSize: '15px', fontWeight: 600, marginBottom: '14px', color: 'var(--text-primary)' },
  scoreItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    background: 'var(--bg-elevated)',
    borderRadius: 'var(--radius)',
    marginBottom: '8px',
    fontSize: '14px',
  },
  scoreNum: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    background: 'var(--accent)',
    color: '#0f1117',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  deleteBtn: {
    background: 'transparent',
    border: '1px solid var(--danger)',
    color: 'var(--danger)',
    padding: '7px 14px',
    borderRadius: 'var(--radius)',
    fontSize: '13px',
    marginTop: '20px',
  },
  loading: { padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' },
  error: { padding: '60px', textAlign: 'center', color: 'var(--danger)' },
}

export default function CandidateDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [candidate, setCandidate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function fetchCandidate() {
    try {
      const res = await getCandidate(id)
      setCandidate(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load candidate')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCandidate() }, [id])

  async function handleDelete() {
    if (!window.confirm('Archive this candidate?')) return
    try {
      await deleteCandidate(id)
      navigate('/candidates')
    } catch (err) {
      window.alert(err.response?.data?.detail || 'Failed to archive candidate')
    }
  }

  if (loading) return <div style={styles.loading}>Loading...</div>
  if (error) return <div style={styles.error}>{error}</div>
  if (!candidate) return null

  const statusColor = STATUS_COLORS[candidate.status] || '#8b90a7'

  return (
    <div style={styles.page}>
      <button style={styles.backBtn} onClick={() => navigate('/candidates')}>
        Back to candidates
      </button>

      <div style={styles.card}>
        <div style={styles.nameRow}>
          <div style={styles.name}>{candidate.name}</div>
          <span style={{ ...styles.badge, background: `${statusColor}1a`, color: statusColor }}>
            {candidate.status}
          </span>
        </div>
        <div style={styles.meta}>
          {candidate.email} - {candidate.role_applied} - Added {new Date(candidate.created_at).toLocaleDateString()}
        </div>
        {candidate.skills?.length > 0 && (
          <div style={styles.chips}>
            {candidate.skills.map(s => <span key={s} style={styles.chip}>{s}</span>)}
          </div>
        )}
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          Scores ({candidate.scores?.length ?? 0})
          {user?.role === 'reviewer' && ' - your scores only'}
        </div>
        {candidate.scores?.length === 0 && (
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No scores yet.</div>
        )}
        {candidate.scores?.map(s => (
          <div key={s.id} style={styles.scoreItem}>
            <div style={styles.scoreNum}>{s.score}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{s.category}</div>
              {s.note && <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{s.note}</div>}
              {user?.role === 'admin' && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                  reviewer: {s.reviewer_id}
                </div>
              )}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
              {new Date(s.created_at).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      <ScoreForm candidateId={id} onSuccess={fetchCandidate} />
      <AISummary candidateId={id} />

      {user?.role === 'admin' && (
        <InternalNotes candidateId={id} initialNotes={candidate.internal_notes} />
      )}

      {user?.role === 'admin' && (
        <button style={styles.deleteBtn} onClick={handleDelete}>Archive Candidate</button>
      )}
    </div>
  )
}
