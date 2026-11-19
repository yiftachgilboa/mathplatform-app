/*
 * kidodo — the link between a practice page (התנסות) and the course.
 *
 * The course opens a practice as a full page:
 *   /practices/<name>.html?childId=…&courseId=…&lessonId=…
 * The practice calls:
 *   KidodoPractice.answer(correct)   — one answer (saved as a stage-2 answer, does not count for mastery)
 *   KidodoPractice.complete(extra)   — marks stage 2 as done (returns a Promise, never throws)
 *   KidodoPractice.next()            — back to the course, on the next stage (3)
 *   KidodoPractice.exit()            — back to the course, on this stage (2)
 * Opened alone (no params), nothing is saved, and next/exit go to /course.
 *
 * Embedded: the course normally shows the practice inside its stage, in an
 * <iframe> (small, with an enlarge button). Then next/exit/complete do not
 * navigate – they tell the course page through postMessage({ kidodo: … }).
 *
 * A game in stage 3 (practice) or 4 (enrichment) is opened by the course as a
 * full page with &courseStage=3|4 — then answers, complete and next/exit use
 * that stage (stage-3 answers count for mastery).
 */
(function () {
  var p = new URLSearchParams(location.search)
  var STAGE = Number(p.get('courseStage')) || 2
  var ctx = { childId: p.get('childId'), courseId: p.get('courseId'), lessonId: p.get('lessonId') }
  var inCourse = !!(ctx.childId && ctx.courseId && ctx.lessonId)
  var embedded = false
  try { embedded = window.parent !== window && window.parent.location.origin === location.origin } catch (e) {}

  function tell(action) {
    try { window.parent.postMessage({ kidodo: action }, location.origin) } catch (e) {}
  }

  function post(path, body) {
    if (!inCourse) return Promise.resolve(null)
    var payload = JSON.stringify(Object.assign({}, ctx, { stage: STAGE }, body || {}))
    var req = fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true })
      .then(function (r) { return r.ok }).catch(function () { return false })
    // never leave the child waiting on a slow network
    return Promise.race([req, new Promise(function (res) { setTimeout(function () { res(false) }, 2500) })])
  }

  function courseUrl(stage) {
    if (!inCourse) return '/course'
    return '/course/' + encodeURIComponent(ctx.courseId) + '/' + encodeURIComponent(ctx.lessonId) +
      '?child=' + encodeURIComponent(ctx.childId) + '&stage=' + stage
  }

  window.KidodoPractice = {
    inCourse: inCourse,
    embedded: embedded,
    ctx: ctx,
    answer: function (correct) { post('/api/course/answer', { correct: !!correct }) },
    complete: function (extra) {
      var r = post('/api/course/progress', extra)
      if (embedded) r.then(function () { tell('complete') })
      return r
    },
    next: function () { if (embedded) tell('next'); else location.replace(courseUrl(STAGE + 1)) },
    exit: function () { if (embedded) tell('exit'); else location.replace(courseUrl(STAGE)) },
  }
})()
