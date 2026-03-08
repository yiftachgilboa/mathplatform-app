import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server-client'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  redirect(user ? '/dashboard' : '/login')
}
