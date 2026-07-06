'use client'

import { useActionState, useState } from 'react'
import { signInWithEmail, sendMagicLinkEmail, type SignInState, type MagicLinkState } from '../actions'

function MagicLinkForm() {
  const [state, formAction, pending] = useActionState<MagicLinkState, FormData>(sendMagicLinkEmail, null)

  if (state?.sent) {
    return (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <p style={{ color: 'var(--green)', fontFamily: 'var(--sans)' }} className="text-[13px] font-medium mb-1">
          Link sent.
        </p>
        <p style={{ color: 'var(--ink-soft)', fontFamily: 'var(--sans)' }} className="text-[12px]">
          Check your inbox for a sign-in link from Elevate.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction}>
      <div className="mb-5">
        <label
          htmlFor="magic-email"
          style={{ color: 'var(--ink)', fontFamily: 'var(--sans)' }}
          className="block text-[12px] font-semibold tracking-[0.06em] uppercase mb-2"
        >
          Email address
        </label>
        <input
          id="magic-email"
          name="email"
          type="email"
          placeholder="you@company.com"
          autoFocus
          style={{
            border: '1px solid var(--line)', background: 'var(--paper)',
            color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--navy)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--line)' }}
          className="w-full px-3.5 py-2.5 text-[14px] rounded-none transition-colors"
        />
      </div>
      {state?.error && (
        <p style={{ color: 'var(--red)', fontFamily: 'var(--sans)' }} className="text-[12px] mb-4 -mt-2" role="alert">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        style={{
          background: pending ? 'var(--slate)' : 'var(--navy)',
          color: 'var(--cream)', fontFamily: 'var(--sans)',
          cursor: pending ? 'not-allowed' : 'pointer', border: 'none',
        }}
        className="w-full py-2.5 text-[13px] font-semibold tracking-[0.06em] uppercase transition-colors"
      >
        {pending ? 'Sending…' : 'Send sign-in link'}
      </button>
    </form>
  )
}

export function LoginForm() {
  const [state, formAction, isPending] = useActionState<SignInState, FormData>(
    signInWithEmail,
    null
  )
  const [showPassword, setShowPassword] = useState(false)
  const [useMagicLink, setUseMagicLink] = useState(false)

  return (
    <div>
      {useMagicLink ? (
        <>
          <MagicLinkForm />
          <button
            type="button"
            onClick={() => setUseMagicLink(false)}
            style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)', background: 'none', border: 'none', cursor: 'pointer' }}
            className="w-full mt-4 text-[11px] tracking-[0.04em] hover:text-[var(--navy)] transition-colors"
          >
            Sign in with password instead
          </button>
        </>
      ) : (
        <>
          <form action={formAction} noValidate>
            <div className="mb-4">
              <label
                htmlFor="email"
                style={{ color: 'var(--ink)', fontFamily: 'var(--sans)' }}
                className="block text-[12px] font-semibold tracking-[0.06em] uppercase mb-2"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                autoFocus
                required
                placeholder="you@company.com"
                style={{
                  border: '1px solid var(--line)', background: 'var(--paper)',
                  color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--navy)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--line)' }}
                className="w-full px-3.5 py-2.5 text-[14px] rounded-none transition-colors"
              />
            </div>

            <div className="mb-5">
              <label
                htmlFor="password"
                style={{ color: 'var(--ink)', fontFamily: 'var(--sans)' }}
                className="block text-[12px] font-semibold tracking-[0.06em] uppercase mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  style={{
                    border: '1px solid var(--line)', background: 'var(--paper)',
                    color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--navy)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--line)' }}
                  className="w-full px-3.5 py-2.5 pr-10 text-[14px] rounded-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{ color: 'var(--slate-soft)' }}
                  className="absolute inset-y-0 right-0 flex items-center px-3 hover:opacity-70 transition-opacity"
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {state?.error && (
              <p style={{ color: 'var(--red)' }} className="text-[12px] mb-4 -mt-2" role="alert">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              style={{
                background: isPending ? 'var(--slate)' : 'var(--navy)',
                color: 'var(--cream)', fontFamily: 'var(--sans)',
                cursor: isPending ? 'not-allowed' : 'pointer',
              }}
              className="w-full py-2.5 text-[13px] font-semibold tracking-[0.06em] uppercase transition-colors"
            >
              {isPending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setUseMagicLink(true)}
            style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)', background: 'none', border: 'none', cursor: 'pointer' }}
            className="w-full mt-4 text-[11px] tracking-[0.04em] hover:text-[var(--navy)] transition-colors"
          >
            No password? Get a sign-in link instead
          </button>
        </>
      )}
    </div>
  )
}
