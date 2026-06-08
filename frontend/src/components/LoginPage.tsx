import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { api } from '../api'
import type { User } from '../types'
import PixelSprite from './PixelSprite'

export default function LoginPage({ onLogin }: { onLogin: (u: User) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.login(username, password)
      localStorage.setItem('token', res.token)
      onLogin(res.user)
    } catch (err: any) {
      setError(err.message || 'Access denied')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden scanlines">
      <div className="absolute inset-0 chemical-bg" />
      <div className="absolute inset-0 pixel-bg" />
      <div className="absolute top-0 left-0 right-0 h-1 hazard-stripe-thin" />
      <div className="absolute bottom-0 left-0 right-0 h-1 hazard-stripe-thin" />

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-24 h-24 pixel-frame rounded-lg mb-6 bg-primary/5">
            <PixelSprite src="/assets/pixel/characters/cook.png" alt="Cook" size="xl" glow />
          </div>
          <h1 className="text-5xl font-display text-primary text-glow-green mb-2 transform -rotate-1">
            HEISENBERG
          </h1>
          <p className="font-pixel text-[9px] text-muted-foreground tracking-wider leading-relaxed">
            EVIDENCE & DISTRIBUTION
          </p>
        </div>

        <div className="bg-card/80 backdrop-blur-sm border border-border rounded-xl p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border">
            <AlertTriangle size={16} className="text-warning" />
            <span className="text-xs uppercase tracking-wider text-warning font-semibold">Restricted Access</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                Codename
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="heisenberg"
                className="w-full bg-background border border-input rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                Passcode
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="blue"
                className="w-full bg-background border border-input rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                required
              />
              <p className="text-[11px] text-muted-foreground mt-1.5">Demo: heisenberg / jesse / mike -- password: blue</p>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 text-sm text-destructive flex items-center gap-2">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="animate-pulse">Authenticating...</span>
              ) : (
                <>
                  <span className="text-sm uppercase tracking-wider">Enter the Lab</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-8">
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
            Albuquerque, NM / All activities logged
          </p>
        </div>
      </div>
    </div>
  )
}
