import SignOutIconButton from './SignOutIconButton'

/** כותרת: לוגו ימין · דמות + ברכה במרכז · יציאה שמאל */
export default function CourseHeader({ hello, avatar, avatarLabel, logoutLabel }: {
  hello: string; avatar: string; avatarLabel: string; logoutLabel: string
}) {
  return (
    <header className="c-header">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="logo" src="/course/kidodo-wordmark.png" alt="kidodo" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <span className="ava">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatar} alt={avatarLabel} />
        </span>
        <span className="hello">{hello}</span>
      </div>
      <SignOutIconButton label={logoutLabel} size={44} />
    </header>
  )
}
