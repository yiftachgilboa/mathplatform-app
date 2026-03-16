'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SignOutButton() {
  const router = useRouter()
  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }
  return (
    <button onClick={handleSignOut}
      style={{
        background: 'transparent',
        border: '1px solid var(--color-card-border)',
        color: 'var(--color-text-muted)',
        borderRadius: 'var(--radius-pill)',
        padding: '6px 16px',
        cursor: 'pointer',
        fontFamily: 'var(--font-primary)',
        fontSize: '13px'
      }}>
      התנתק
    </button>
  )
}
