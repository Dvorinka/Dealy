import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import LoginPage from './components/LoginPage'
import Dashboard from './components/Dashboard'
import EvidencePage from './components/EvidencePage'
import OrdersPage from './components/OrdersPage'
import CustomersPage from './components/CustomersPage'
import MapPage from './components/MapPage'
import AccountSettingsPage from './components/AccountSettingsPage'
import PlatformSettingsPage from './components/PlatformSettingsPage'
import ShopPage from './components/ShopPage'
import type { User } from './types'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(u => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl font-display text-primary animate-pulse-slow mb-4">HEISENBERG</div>
          <div className="text-muted-foreground text-sm">Initializing secure connection...</div>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<ShopPage />} />
      <Route
        path="/admin"
        element={
          user ? (
            <Layout user={user} onLogout={() => { localStorage.removeItem('token'); setUser(null) }} />
          ) : (
            <LoginPage onLogin={setUser} />
          )
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="evidence" element={<EvidencePage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="settings/account" element={<AccountSettingsPage user={user!} onUserUpdate={setUser} />} />
        <Route path="settings/platform" element={<PlatformSettingsPage user={user!} />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
