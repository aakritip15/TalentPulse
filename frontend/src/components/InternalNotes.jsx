import React, { useState } from 'react'
import { updateNotes } from '../api/client.js'

const styles = {
  card: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '20px',
    marginTop: '20px',
  },
  heading: { fontSize: '15px', fontWeight: 600, marginBottom: '16px' },
  textarea: { width: '100%', minHeight: '100px', resize: 'vertical', marginBottom: '12px' },
  saveBtn: {
    background: 'var(--accent)',
    color: '#0f1117',
    border: 'none',
    padding: '9px 20px',
    borderRadius: 'var(--radius)',
    fontWeight: 600,
    fontSize: '14px',
  },
  success: { color: 'var(--success)', fontSize: '13px', marginTop: '8px' },
  error: { color: 'var(--danger)', fontSize: '13px', marginTop: '8px' },
}

export default function InternalNotes({ candidateId, initialNotes }) {
  const [notes, setNotes] = useState(initialNotes || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  async function handleSave() {
    setSaving(true)
    setMessage('')
    try {
      await updateNotes(candidateId, notes)
      setMessage('Notes saved successfully')
      setIsError(false)
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Failed to save notes')
      setIsError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={styles.card}>
      <div style={styles.heading}>Internal Notes (Admin Only)</div>
      <textarea
        style={styles.textarea}
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Add internal notes about this candidate..."
      />
      <button style={styles.saveBtn} onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Notes'}
      </button>
      {message && (
        <div style={isError ? styles.error : styles.success}>{message}</div>
      )}
    </div>
  )
}
