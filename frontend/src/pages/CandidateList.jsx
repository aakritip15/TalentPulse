import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCandidates, createCandidate } from '../api/client.js'
import { useAuth } from '../App.jsx'
import { STATUS_COLORS, CANDIDATE_STATUSES } from '../utils/constants.js'

const styles = {
  page: { padding: '24px', maxWidth: '1200px', margin: '0 auto' },
  topRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' },
  title: { fontSize: '20px', fontWeight: 600 },
  addBtn: {
    background: 'var(--accent)',
    color: '#0f1117',
    border: 'none',
    padding: '8px 16px',
    borderRadius: 'var(--radius)',
    fontWeight: 600,
    fontSize: '14px',
  },
  filters: { display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' },
  select: { padding: '7px 10px', minWidth: '140px' },
  input: { padding: '7px 10px', minWidth: '180px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left',
    padding: '10px 14px',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--border)',
  },
  tr: { borderBottom: '1px solid var(--border)', cursor: 'pointer' },
  td: { padding: '12px 14px', fontSize: '14px' },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
  },
  chip: {
    display: 'inline-block',
    padding: '2px 8px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    fontSize: '12px',
    marginRight: '4px',
    marginBottom: '2px',
  },
  pagination: { display: 'flex', alignItems: 'center', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' },
  pageBtn: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    padding: '6px 14px',
    borderRadius: 'var(--radius)',
    fontSize: '13px',
  },
  modal: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 200,
  },
  modalCard: {
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '28px 24px', width: '420px',
  },
  field: { marginBottom: '14px' },
  label: {
    display: 'block', fontSize: '12px', color: 'var(--text-secondary)',
    marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  inp: { width: '100%' },
  submitBtn: {
    background: 'var(--accent)', color: '#0f1117', border: 'none',
    padding: '9px 20px', borderRadius: 'var(--radius)', fontWeight: 600, fontSize: '14px',
  },
  cancelBtn: {
    background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)',
    padding: '9px 16px', borderRadius: 'var(--radius)', fontSize: '14px', marginLeft: '10px',
  },
  fetchError: { color: 'var(--danger)', fontSize: '13px', marginBottom: '12px' },
  formError: { color: 'var(--danger)', fontSize: '13px', marginBottom: '10px' },
}

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function CandidateList() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [candidates, setCandidates] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [fetchError, setFetchError] = useState('')
  const PAGE_SIZE = 20

  const [statusFilter, setStatusFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [skillInput, setSkillInput] = useState('')
  const [keywordInput, setKeywordInput] = useState('')
  const debouncedSkill = useDebounce(skillInput, 300)
  const debouncedKeyword = useDebounce(keywordInput, 300)

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', role_applied: '', skills: '', internal_notes: '' })
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const distinctRoles = [...new Set(candidates.map(c => c.role_applied))].filter(Boolean)

  const fetchCandidates = useCallback(async () => {
    const params = { page, page_size: PAGE_SIZE }
    if (statusFilter) params.status = statusFilter
    if (roleFilter) params.role_applied = roleFilter
    if (debouncedSkill) params.skill = debouncedSkill
    if (debouncedKeyword) params.keyword = debouncedKeyword
    try {
      const res = await getCandidates(params)
      setCandidates(res.data.items)
      setTotal(res.data.total)
      setFetchError('')
    } catch (err) {
      setFetchError(err.response?.data?.detail || 'Failed to load candidates')
    }
  }, [page, statusFilter, roleFilter, debouncedSkill, debouncedKeyword])

  useEffect(() => { fetchCandidates() }, [fetchCandidates])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  async function handleCreate(e) {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')
    try {
      await createCandidate({
        ...form,
        skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
      })
      setShowModal(false)
      setForm({ name: '', email: '', role_applied: '', skills: '', internal_notes: '' })
      fetchCandidates()
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to create candidate')
    } finally {
      setSubmitting(false)
    }
  }

  const statusColor = (status) => STATUS_COLORS[status] || '#8b90a7'

  return (
    <div style={styles.page}>
      <div style={styles.topRow}>
        <div style={styles.title}>Candidates</div>
        {user?.role === 'admin' && (
          <button style={styles.addBtn} onClick={() => setShowModal(true)}>Add Candidate</button>
        )}
      </div>

      <div style={styles.filters}>
        <select style={styles.select} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
          <option value="">All Statuses</option>
          {CANDIDATE_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select style={styles.select} value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1) }}>
          <option value="">All Roles</option>
          {distinctRoles.map(r => <option key={r}>{r}</option>)}
        </select>
        <input
          style={styles.input}
          placeholder="Filter by skill"
          value={skillInput}
          onChange={e => { setSkillInput(e.target.value); setPage(1) }}
        />
        <input
          style={styles.input}
          placeholder="Search keyword"
          value={keywordInput}
          onChange={e => { setKeywordInput(e.target.value); setPage(1) }}
        />
      </div>

      {fetchError && <div style={styles.fetchError}>{fetchError}</div>}

      <table style={styles.table}>
        <thead>
          <tr>
            {['Name', 'Email', 'Role Applied', 'Skills', 'Status', 'Created'].map(h => (
              <th key={h} style={styles.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {candidates.map(c => (
            <tr
              key={c.id}
              className="candidate-row"
              style={styles.tr}
              onClick={() => navigate(`/candidates/${c.id}`)}
            >
              <td style={styles.td}>{c.name}</td>
              <td style={{ ...styles.td, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
                {c.email}
              </td>
              <td style={styles.td}>{c.role_applied}</td>
              <td style={styles.td}>
                {(c.skills || []).slice(0, 3).map(s => <span key={s} style={styles.chip}>{s}</span>)}
                {c.skills?.length > 3 && (
                  <span style={{ ...styles.chip, color: 'var(--text-secondary)' }}>+{c.skills.length - 3}</span>
                )}
              </td>
              <td style={styles.td}>
                <span style={{ ...styles.badge, background: `${statusColor(c.status)}1a`, color: statusColor(c.status) }}>
                  {c.status}
                </span>
              </td>
              <td style={{ ...styles.td, color: 'var(--text-secondary)', fontSize: '13px' }}>
                {new Date(c.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
          {candidates.length === 0 && !fetchError && (
            <tr>
              <td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: 'var(--text-secondary)' }}>
                No candidates found
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={styles.pagination}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
          Page {page} of {totalPages} ({total} total)
        </span>
        <button style={styles.pageBtn} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
        <button style={styles.pageBtn} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
      </div>

      {showModal && (
        <div style={styles.modal} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={styles.modalCard}>
            <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '20px' }}>Add Candidate</div>
            {formError && <div style={styles.formError}>{formError}</div>}
            <form onSubmit={handleCreate}>
              {[['name', 'Name'], ['email', 'Email'], ['role_applied', 'Role Applied'], ['skills', 'Skills (comma-separated)']].map(([key, lbl]) => (
                <div key={key} style={styles.field}>
                  <label style={styles.label}>{lbl}</label>
                  <input
                    style={styles.inp}
                    required={key !== 'skills'}
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <div style={styles.field}>
                <label style={styles.label}>Internal Notes</label>
                <textarea
                  style={{ ...styles.inp, minHeight: '70px', resize: 'vertical' }}
                  value={form.internal_notes}
                  onChange={e => setForm(f => ({ ...f, internal_notes: e.target.value }))}
                />
              </div>
              <button style={styles.submitBtn} type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create'}
              </button>
              <button style={styles.cancelBtn} type="button" onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
