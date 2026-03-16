export default function Loading() {
  return (
    <>
      <style>{`
        @keyframes sk-pulse {
          0%, 100% { opacity: 0.35; }
          50%       { opacity: 0.7; }
        }
        .sk { animation: sk-pulse 1.4s ease-in-out infinite; }
      `}</style>

      <div
        dir="rtl"
        style={{
          minHeight: '100vh',
          fontFamily: 'var(--font-primary)',
          background:
            'linear-gradient(135deg, var(--color-bg-gradient-from) 0%, var(--color-bg-gradient-mid) 50%, var(--color-bg-gradient-to) 100%)',
        }}
      >
        {/* Header skeleton */}
        <div
          style={{
            background: 'var(--color-card-bg)',
            borderBottom: '1.5px solid var(--color-card-border)',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <SkRect w={60} h={14} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <SkRect w={40} h={40} radius="50%" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <SkRect w={72} h={14} />
              <SkRect w={48} h={10} />
            </div>
          </div>
          <SkRect w={80} h={32} radius="var(--radius-pill)" />
        </div>

        {/* Games skeleton */}
        <div
          style={{
            maxWidth: '900px',
            margin: '0 auto',
            padding: '32px 20px',
          }}
        >
          <SkRect w={120} h={22} style={{ marginBottom: '20px' }} />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '16px',
            }}
          >
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="sk"
                style={{
                  background: 'var(--color-card-bg)',
                  border: '1.5px solid var(--color-card-border)',
                  borderRadius: 'var(--radius-card)',
                  padding: '24px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  animationDelay: `${i * 0.12}s`,
                }}
              >
                <SkRect w={48} h={48} radius="var(--radius-button)" />
                <SkRect w="70%" h={16} />
                <SkRect w={64} h={14} />
                <SkRect w={48} h={10} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function SkRect({
  w,
  h,
  radius = '6px',
  style,
}: {
  w: number | string
  h: number
  radius?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        width: typeof w === 'number' ? `${w}px` : w,
        height: `${h}px`,
        borderRadius: radius,
        background: 'var(--color-card-border)',
        flexShrink: 0,
        ...style,
      }}
    />
  )
}
