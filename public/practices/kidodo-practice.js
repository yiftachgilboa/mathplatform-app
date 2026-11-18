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
 */
(function () {
  var STAGE = 2
  var p = new URLSearchParams(location.search)
  var ctx = { childId: p.get('childId'), courseId: p.get('courseId'), lessonId: p.get('lessonId') }
  var inCourse = !!(ctx.childId && ctx.courseId && ctx.lessonId)

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
    ctx: ctx,
    answer: function (correct) { post('/api/course/answer', { correct: !!correct }) },
    complete: function (extra) { return post('/api/course/progress', extra) },
    next: function () { location.replace(courseUrl(STAGE + 1)) },
    exit: function () { location.replace(courseUrl(STAGE)) },
  }
})()
