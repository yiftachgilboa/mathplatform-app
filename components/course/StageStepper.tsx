/** שורת 5 השלבים: גלולות מחוברות בקו רציף. הנבחר גדל. בלי מספרים ובלי וי. */
export default function StageStepper({ labels, stage, done, label, onPick }: {
  labels: string[]; stage: number; done: number[]; label: string; onPick: (s: number) => void
}) {
  return (
    <div className="c-tabs c-strip" role="tablist" aria-label={label}>
      {labels.map((lb, i) => {
        const s = i + 1
        return (
          <div className="seg" key={lb}>
            <button type="button" role="tab" aria-selected={s === stage} data-done={done.includes(s)}
              className="press c-tab" onClick={() => onPick(s)}>{lb}</button>
            {i < labels.length - 1 && <span className="line" aria-hidden />}
          </div>
        )
      })}
    </div>
  )
}
