'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, LogOut, Building2 } from 'lucide-react'
import Link from 'next/link'
import { signOutAction } from '@/app/(auth)/actions'

interface UserMenuProps {
  email: string
  isSuperAdmin?: boolean
}

export function UserMenu({ email, isSuperAdmin = false }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          color: 'rgba(245,241,232,0.8)',
          fontFamily: 'var(--sans)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 0',
          fontSize: 12,
        }}
      >
        <span className="max-w-[110px] sm:max-w-none truncate">{email}</span>
        <ChevronDown
          size={14}
          strokeWidth={1.6}
          style={{
            transition: 'transform 150ms ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 12px)',
            right: 0,
            background: 'var(--white)',
            border: '1px solid var(--line)',
            boxShadow: 'var(--shadow-md)',
            minWidth: 200,
            zIndex: 50,
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--line-soft)',
            }}
          >
            <p
              style={{
                fontSize: 10,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--slate-soft)',
                fontWeight: 600,
                marginBottom: 2,
              }}
            >
              Signed in as
            </p>
            <p
              style={{
                fontSize: 13,
                color: 'var(--ink)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {email}
            </p>
          </div>

          <div style={{ padding: 4 }}>
            {isSuperAdmin && (
              <Link
                href="/settings/clients"
                onClick={() => setOpen(false)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  fontSize: 13,
                  color: 'var(--ink-soft)',
                  fontFamily: 'var(--sans)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderRadius: 2,
                  textDecoration: 'none',
                  transition: 'background 100ms ease, color 100ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--cream)'
                  e.currentTarget.style.color = 'var(--navy)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none'
                  e.currentTarget.style.color = 'var(--ink-soft)'
                }}
              >
                <Building2 size={14} strokeWidth={1.6} />
                Manage companies
              </Link>
            )}
            <form action={signOutAction}>
              <button
                type="submit"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  fontSize: 13,
                  color: 'var(--ink-soft)',
                  fontFamily: 'var(--sans)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderRadius: 2,
                  transition: 'background 100ms ease, color 100ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--cream)'
                  e.currentTarget.style.color = 'var(--navy)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none'
                  e.currentTarget.style.color = 'var(--ink-soft)'
                }}
              >
                <LogOut size={14} strokeWidth={1.6} />
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
