/** קודם (ימין, light) / הבא (שמאל, primary) — תמיד פעילים, אייקון בלבד */
export default function StageNav({ prevLabel, nextLabel, onPrev, onNext, hidePrev, hideNext }: {
  prevLabel: string; nextLabel: string; onPrev: () => void; onNext: () => void; hidePrev?: boolean; hideNext?: boolean
}) {
  return (
    <div className="c-nav">
      <button type="button" className="press c-light" aria-label={prevLabel} onClick={onPrev} style={{ visibility: hidePrev ? 'hidden' : undefined }}>
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#164D78" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </button>
      <button type="button" className="press c-primary" aria-label={nextLabel} onClick={onNext} style={{ visibility: hideNext ? 'hidden' : undefined }}>
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
      </button>
    </div>
  )
}
