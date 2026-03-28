import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SelectChildClient from './SelectChildClient'

export default async function SelectChildPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('access_code')
    .eq('id', user.id)
    .single()

  return (
    <SelectChildClient
      userEmail={user.email ?? null}
      accessCode={profile?.access_code ?? null}
    />
  )
}
