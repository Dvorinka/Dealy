import { useState } from 'react'
import { UserCog, Save, Shield } from 'lucide-react'
import { api } from '../api'
import type { User } from '../types'

export default function AccountSettingsPage({
  user,
  onUserUpdate,
}: {
  user: User
  onUserUpdate: (user: User) => void
}) {
  const [username, setUsername] = useState(user.username)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSave = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      setStatus('error')
      setMessage('New passwords do not match.')
      return
    }

    if (newPassword && !currentPassword) {
      setStatus('error')
      setMessage('Enter your current password to set a new one.')
      return
    }

    setStatus('loading')
    try {
      const updated = await api.updateMe({
        username: username.trim() !== user.username ? username.trim() : undefined,
        current_password: currentPassword || undefined,
        new_password: newPassword || undefined,
      })
      onUserUpdate(updated)
      if (updated.username !== user.username) {
        localStorage.setItem('token', updated.username)
      }
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setStatus('success')
      setMessage('Account settings saved.')
    } catch (err: any) {
      setStatus('error')
      setMessage(err.message || 'Failed to save settings.')
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-3xl font-display text-foreground mb-1 flex items-center gap-3">
          <UserCog size={28} className="text-primary" />
          Account Settings
        </h2>
        <p className="text-sm text-muted-foreground">Manage your identity and credentials.</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Username</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Role</label>
            <div className="flex items-center gap-2 bg-muted/30 border border-border rounded-lg px-4 py-2.5">
              <Shield size={14} className="text-primary" />
              <span className="text-sm font-semibold text-foreground capitalize">{user.role}</span>
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Status</label>
            <div className="bg-muted/30 border border-border rounded-lg px-4 py-2.5 text-sm font-semibold text-foreground capitalize">
              {user.status}
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-5 space-y-4">
          <h3 className="text-sm font-bold text-foreground">Change Password</h3>
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Required to change password"
              className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {status === 'success' && (
          <div className="bg-success/10 border border-success/20 rounded-lg px-4 py-3 text-success text-sm">{message}</div>
        )}
        {status === 'error' && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 text-destructive text-sm">{message}</div>
        )}

        <button
          onClick={handleSave}
          disabled={status === 'loading'}
          className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors"
        >
          <Save size={16} />
          {status === 'loading' ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
