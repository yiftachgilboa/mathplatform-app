/** שורת השלבים: גלולות מחוברות בקו רציף. הנבחר גדל. בלי מספרים ובלי וי.
 *  מוצגים רק השלבים שב-stages (אלה שיש בהם תוכן); המספור (1–5) נשמר. */
export default function StageStepper({ labels, stages, stage, done, label, onPick }: {
  labels: string[]; stages: number[]; stage: number; done: number[]; label: string; onPick: (s: number) => void
}) {
  return (
    <div className="c-tabs c-strip" role="tablist" aria-label={label}>
      {stages.map((s, i) => (
        <div className="seg" key={s}>
          <button type="button" role="tab" aria-selected={s === stage} data-done={done.includes(s)} data-stage={s}
            className="press c-tab" onClick={() => onPick(s)}>{labels[s - 1]}</button>
          {i < stages.length - 1 && <span className="line" aria-hidden />}
        </div>
      ))}
    </div>
  )
}
