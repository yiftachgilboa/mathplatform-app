/** הקראה בעברית של הדמות בעמוד הקורס (המשחקים מקריאים בעצמם). בלי קול עברי הבועה נשארת טקסט בלבד. */
function hebrewVoice(): SpeechSynthesisVoice | undefined {
  const he = window.speechSynthesis.getVoices().filter(v => /^(he|iw)/i.test(v.lang))
  return he.find(v => /hila|carmit|female|woman/i.test(v.name)) ?? he.find(v => !/avri|asaf|male/i.test(v.name)) ?? he[0]
}

/** הדפדפן מרשה קול רק אחרי נגיעה ראשונה בעמוד */
export function canSpeak() {
  return !navigator.userActivation || navigator.userActivation.hasBeenActive
}

/** מקריא. onEnd נקרא פעם אחת בסוף (לא אם הושתק). מחזיר פונקציית עצירה, או null אם אי אפשר להקריא. */
export function speak(text: string, onEnd: () => void): (() => void) | null {
  try {
    const s = window.speechSynthesis
    const voice = s && hebrewVoice()
    if (!voice || !canSpeak()) return null
    let over = false
    const end = () => { if (!over) { over = true; clearTimeout(timer); onEnd() } }
    const timer = setTimeout(end, text.length * 130 + 3000)   // יש דפדפנים שלא מודיעים על הסוף
    s.cancel()
    const u = new SpeechSynthesisUtterance(text.replace(/[״"׳]/g, ''))
    u.voice = voice
    u.lang = voice.lang
    u.rate = .95
    u.onend = u.onerror = end
    s.speak(u)
    return () => { if (!over) { over = true; clearTimeout(timer); s.cancel() } }
  } catch {
    return null
  }
}
