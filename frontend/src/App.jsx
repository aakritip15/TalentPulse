import React, { createContext, useContext, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import CandidateList from './pages/CandidateList.jsx'
import CandidateDetail from './pages/CandidateDetail.jsx'
import Navbar from './components/Navbar.jsx'

export const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

function ProtectedRoute({ children }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user'))
    } catch {
      return null
    }
  })

  function login(newToken, newUser) {
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      <BrowserRouter>
        {token && <Navbar />}
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/candidates"
            element={
              <ProtectedRoute>
                <CandidateList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidates/:id"
            element={
              <ProtectedRoute>
                <CandidateDetail />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/candidates" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
