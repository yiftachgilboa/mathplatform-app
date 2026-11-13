'use client'
import { createClient } from '@/lib/supabase/client'

/** כפתור יציאה עגול (אייקון בלבד) → signOut → /login */
export default function SignOutIconButton({ label, size = 46 }: { label: string; size?: number }) {
  async function signOut() {
    await createClient().auth.signOut()
    window.location.href = '/login?next=/course'
  }
  return (
    <button type="button" onClick={signOut} aria-label={label} title={label} className="press c-light"
      style={{ flex: 'none', width: size, height: size, padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#164D78" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /><path d="M9 8l-4 4 4 4" /><path d="M5 12h10" />
      </svg>
    </button>
  )
}
