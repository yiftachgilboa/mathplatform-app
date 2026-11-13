'use client'
import Link from 'next/link'

export type CourseCard = { href: string; childName: string; courseTitle: string; avatar: string }

/** "הקורסים שלי" — מוצג רק כשיש יותר מקורס/ילד אחד */
export default function MyCoursesClient({ title, cards }: { title: string; cards: CourseCard[] }) {
  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 16px 56px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/course/kidodo-wordmark.png" alt="kidodo" style={{ width: 140, height: 52, objectFit: 'contain' }} />
      </div>
      <h1 style={{ margin: '0 0 24px', fontSize: 40, fontWeight: 900, letterSpacing: '-0.035em', textAlign: 'center' }}>
        {title}
        <span aria-hidden style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: 'var(--dot)', marginInlineStart: 5 }} />
      </h1>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {cards.map(c => (
          <li key={c.href}>
            <Link href={c.href} className="press" style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: 22, borderRadius: 32,
              background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink)', textDecoration: 'none',
            }}>
              <span style={{ flex: 'none', width: 72, height: 72, borderRadius: '50%', background: '#DFF3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.avatar} alt="" style={{ width: 60, height: 60, objectFit: 'contain' }} />
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.5px' }}>{c.childName}</span>
                <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink-soft)' }}>{c.courseTitle}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
