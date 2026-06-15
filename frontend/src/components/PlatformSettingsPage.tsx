import { useEffect, useState } from 'react'
import { Settings, Save, AlertTriangle } from 'lucide-react'
import { api } from '../api'
import type { PlatformSettings, User } from '../types'

const defaultSettings: PlatformSettings = {
  shop_name: 'The Shop',
  default_territory: 'Albuquerque',
  order_code_prefix: 'ORD',
  require_dropoff: true,
  maintenance_mode: false,
  shop_welcome_message: 'Browse available product. Buyer discretion advised.',
}

export default function PlatformSettingsPage({ user }: { user: User }) {
  const [settings, setSettings] = useState<PlatformSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const isAdmin = user.role === 'admin'

  useEffect(() => {
    api.getPlatformSettings()
      .then(s => setSettings({ ...defaultSettings, ...s }))
      .catch(() => setSettings(defaultSettings))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!isAdmin) return
    setStatus('loading')
    try {
      const updated = await api.updatePlatformSettings(settings)
      setSettings({ ...defaultSettings, ...updated })
      setStatus('success')
      setMessage('Platform settings saved.')
    } catch (err: any) {
      setStatus('error')
      setMessage(err.message || 'Failed to save platform settings.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-primary font-display text-xl">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-3xl font-display text-foreground mb-1 flex items-center gap-3">
          <Settings size={28} className="text-primary" />
          Platform Settings
        </h2>
        <p className="text-sm text-muted-foreground">Configure shop behavior and platform defaults.</p>
      </div>

      {!isAdmin && (
        <div className="bg-warning/10 border border-warning/20 rounded-xl px-4 py-3 flex items-center gap-2 text-warning text-sm">
          <AlertTriangle size={16} />
          Admin role required to modify platform settings.
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Shop Name</label>
          <input
            type="text"
            value={settings.shop_name}
            onChange={e => setSettings({ ...settings, shop_name: e.target.value })}
            disabled={!isAdmin}
            className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Welcome Message</label>
          <textarea
            value={settings.shop_welcome_message}
            onChange={e => setSettings({ ...settings, shop_welcome_message: e.target.value })}
            disabled={!isAdmin}
            rows={2}
            className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-60"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Default Territory</label>
            <input
              type="text"
              value={settings.default_territory}
              onChange={e => setSettings({ ...settings, default_territory: e.target.value })}
              disabled={!isAdmin}
              className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Order Code Prefix</label>
            <input
              type="text"
              value={settings.order_code_prefix}
              onChange={e => setSettings({ ...settings, order_code_prefix: e.target.value })}
              disabled={!isAdmin}
              className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
          </div>
        </div>

        <div className="space-y-3 border-t border-border pt-5">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.require_dropoff}
              onChange={e => setSettings({ ...settings, require_dropoff: e.target.checked })}
              disabled={!isAdmin}
              className="w-4 h-4 rounded border-input"
            />
            <span className="text-sm text-foreground">Require drop-off location on shop orders</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.maintenance_mode}
              onChange={e => setSettings({ ...settings, maintenance_mode: e.target.checked })}
              disabled={!isAdmin}
              className="w-4 h-4 rounded border-input"
            />
            <span className="text-sm text-foreground">Maintenance mode (disable new shop orders)</span>
          </label>
        </div>

        {status === 'success' && (
          <div className="bg-success/10 border border-success/20 rounded-lg px-4 py-3 text-success text-sm">{message}</div>
        )}
        {status === 'error' && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 text-destructive text-sm">{message}</div>
        )}

        {isAdmin && (
          <button
            onClick={handleSave}
            disabled={status === 'loading'}
            className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors"
          >
            <Save size={16} />
            {status === 'loading' ? 'Saving...' : 'Save Platform Settings'}
          </button>
        )}
      </div>
    </div>
  )
}
