import SignOutIconButton from './SignOutIconButton'

/** כותרת: לוגו ימין · ברכה במרכז · מעבר לאפליקציה + יציאה שמאל. strip = הדמות, המטבעות והחנות (בטלפון, במקום הלוגו והברכה) */
export default function CourseHeader({ hello, avatar, avatarLabel, logoutLabel, platformHref, platformLabel, strip }: {
  hello: string; avatar: string; avatarLabel: string; logoutLabel: string
  platformHref: string; platformLabel: string; strip?: React.ReactNode
}) {
  return (
    <header className="c-header" data-strip={!!strip || undefined}>
      {strip}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="logo" src="/course/kidodo-wordmark.png" alt="kidodo" />
      <div className="hi">
        {!strip && (
          <span className="ava">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatar} alt={avatarLabel} />
          </span>
        )}
        <span className="hello">{hello}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
        {/* מעבר לאפליקציה (אותו חשבון, בלי כניסה נוספת) */}
        <a href={platformHref} aria-label={platformLabel} title={platformLabel} className="press c-light"
          style={{ flex: 'none', width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#3A3F44" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 11h4M8 9v4" /><path d="M15 12h.01M18 10h.01" />
            <path d="M17.3 5H6.7a4 4 0 0 0-3.96 3.4l-.9 6.4A2.6 2.6 0 0 0 4.4 18a2.6 2.6 0 0 0 2.1-1.1L8 15h8l1.5 1.9A2.6 2.6 0 0 0 19.6 18a2.6 2.6 0 0 0 2.56-3.2l-.9-6.4A4 4 0 0 0 17.3 5z" />
          </svg>
        </a>
        <SignOutIconButton label={logoutLabel} size={44} />
      </div>
    </header>
  )
}
