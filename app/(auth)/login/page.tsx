import type { Metadata } from 'next'
import Image from 'next/image'
import { LoginForm } from './LoginForm'

export const metadata: Metadata = {
  title: 'Sign in — Elevate Fiduciary Workspace',
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--cream)' }}
    >
      {/* Brand mark */}
      <div className="mb-10 text-center">
        <Image
          src="/elevate-logo-color.png"
          alt="Elevate"
          width={200}
          height={52}
          className="h-12 w-auto mx-auto mb-3"
          priority
        />
        <p
          style={{ color: 'var(--slate-soft)', fontFamily: 'var(--sans)' }}
          className="text-[10px] font-semibold tracking-[0.22em] uppercase"
        >
          Fiduciary Workspace
        </p>
      </div>

      {/* Card */}
      <div
        style={{
          background: 'var(--white)',
          border: '1px solid var(--line)',
          boxShadow: 'var(--shadow-md)',
        }}
        className="w-full max-w-sm px-8 py-10"
      >
        <h2
          style={{ fontFamily: 'var(--display)', color: 'var(--navy)', fontWeight: 700 }}
          className="text-2xl tracking-[-0.01em] mb-1"
        >
          Sign in
        </h2>
        <p style={{ color: 'var(--ink-soft)' }} className="text-[13px] mb-8">
          Enter your email and password to continue.
        </p>

        <LoginForm />
      </div>

      <p style={{ color: 'var(--slate-soft)' }} className="mt-8 text-[11px] tracking-[0.04em]">
        &copy; 2026 Elevate Advisor Group
      </p>
    </div>
  )
}
