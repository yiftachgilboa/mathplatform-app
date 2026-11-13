import { redirect } from 'next/navigation'
import { getCourse, allCourseIds } from '@/lib/course/content'
import { currentUser } from '@/lib/course/admin'
import SignOutIconButton from '@/components/course/SignOutIconButton'

/** "הקורס עוד לא פתוח בחשבון הזה" + קישור לעמוד הנחיתה */
export default async function NoAccessPage() {
  const user = await currentUser()
  if (!user) redirect('/login?next=/course')
  const ui = getCourse(allCourseIds()[0])!.ui

  return (
    <main style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '40px 16px', textAlign: 'center' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/course/kidodo-mascot.webp" alt="" className="pop" style={{ width: 160, height: 160, objectFit: 'contain' }} />
      <h1 style={{ margin: 0, fontSize: 36, fontWeight: 900, letterSpacing: '-0.035em', maxWidth: 520 }}>{ui.noAccess}</h1>
      <a href={ui.noAccessUrl} className="press c-primary" style={{ minHeight: 56, padding: '0 32px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', fontSize: 20, fontWeight: 800, textDecoration: 'none' }}>
        {ui.noAccessLink}
      </a>
      <SignOutIconButton label={ui.logout} />
    </main>
  )
}
