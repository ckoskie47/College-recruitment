'use client'

import { useState, useTransition, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function SetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/engagements'

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message)
        return
      }
      router.push(next)
    })
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 400 }}>
      <div className="mb-5">
        <label
          htmlFor="password"
          style={{ color: 'var(--ink)', fontFamily: 'var(--sans)' }}
          className="block text-[11px] font-semibold tracking-[0.08em] uppercase mb-2"
        >
          New password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          autoFocus
          required
          style={{
            width: '100%', border: '1px solid var(--line)',
            background: 'var(--paper)', color: 'var(--ink)',
            fontFamily: 'var(--sans)', outline: 'none',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--navy)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--line)' }}
          className="px-3.5 py-2.5 text-[14px]"
        />
      </div>

      <div className="mb-7">
        <label
          htmlFor="confirm"
          style={{ color: 'var(--ink)', fontFamily: 'var(--sans)' }}
          className="block text-[11px] font-semibold tracking-[0.08em] uppercase mb-2"
        >
          Confirm password
        </label>
        <input
          id="confirm"
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="Repeat password"
          required
          style={{
            width: '100%', border: '1px solid var(--line)',
            background: 'var(--paper)', color: 'var(--ink)',
            fontFamily: 'var(--sans)', outline: 'none',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--navy)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--line)' }}
          className="px-3.5 py-2.5 text-[14px]"
        />
      </div>

      {error && (
        <p style={{ color: 'var(--red)', fontFamily: 'var(--sans)' }} className="text-[12px] mb-5 -mt-4" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        style={{
          width: '100%', background: pending ? 'var(--slate)' : 'var(--navy)',
          color: 'var(--cream)', fontFamily: 'var(--sans)',
          border: 'none', cursor: pending ? 'not-allowed' : 'pointer',
        }}
        className="py-3 text-[12px] font-semibold tracking-[0.08em] uppercase transition-colors"
      >
        {pending ? 'Setting password…' : 'Set password and continue'}
      </button>
    </form>
  )
}

export default function SetPasswordPage() {
  return (
    <div
      style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}
    >
      {/* Brand mark */}
      <div style={{ marginBottom: 48, textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--display)', fontSize: 22, margin: 0 }}>
          <span style={{ color: 'var(--gold-soft)' }}>Elevate</span>
          <span style={{ color: 'var(--navy)' }}> Advisor Group</span>
        </p>
        <p style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)', fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 4 }}>
          Fiduciary Workspace
        </p>
      </div>

      {/* Card */}
      <div style={{ background: 'var(--white)', border: '1px solid var(--line)', padding: '40px', width: '100%', maxWidth: 440 }}>
        <div style={{ marginBottom: 32 }}>
          <p style={{ color: 'var(--gold)', fontFamily: 'var(--sans)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            Almost there
          </p>
          <h1 style={{ fontFamily: 'var(--display)', color: 'var(--navy)', fontSize: 28, fontWeight: 500, letterSpacing: '-0.01em', margin: '0 0 8px' }}>
            Set your password
          </h1>
          <p style={{ color: 'var(--ink-soft)', fontFamily: 'var(--sans)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            Choose a password so you can sign in again on future visits.
          </p>
        </div>

        <div style={{ height: 1, background: 'var(--line)', marginBottom: 28, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: -1, width: 48, height: 3, background: 'var(--gold)' }} />
        </div>

        <Suspense>
          <SetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
