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
 *   KidodoPractice.claimCorner()     — inside the course: the top-left slot is free for the course's enlarge/shrink button
 *   KidodoPractice.look()            — what the child's hero wears (for LP.hero); {} = the default hero
 *   KidodoPractice.onLook(fn)        — fn(look) when it changes while the game is open
 *   KidodoPractice.reward()          — coins for finishing a practice (shown in the game)
 *   KidodoPractice.onResume(fn)      — fn() when the child is back after a pause and no sentence was cut (say the instruction again)
 * Opened alone (no params), nothing is saved, and next/exit go to /course.
 *
 * Embedded: the course normally shows the practice inside its stage, in an
 * <iframe> (small, with an enlarge button). Then next/exit/complete do not
 * navigate – they tell the course page through postMessage({ kidodo: … }).
 *
 * A game in stage 3 (practice) or 4 (enrichment) is opened by the course as a
 * full page with &courseStage=3|4 — then answers, complete and next/exit use
 * that stage (stage-3 answers count for mastery).
 *
 * Pause: inside the course the game loads frozen and silent, and starts only
 * when the child taps Play (PracticeStage.tsx calls KidodoPause.play()). The
 * course pauses it when the shop opens or the tab is hidden, and the child taps
 * Play again. While paused the game's clock stands still: setTimeout,
 * setInterval, requestAnimationFrame, performance.now, CSS / Web animations,
 * Web Audio and speech. A sentence that was cut starts again from its beginning.
 * A game needs no code for this, as long as it measures time with
 * performance.now() (not Date.now()). The old SDK games get this same file from
 * the course, with data-run (= already running).
 */

/* ---------- the pausable clock, sound and speech ---------- */
(function () {
  if (window.KidodoPause) return
  var me = document.currentScript
  var embedded = false
  try { embedded = window.parent !== window && window.parent.location.origin === location.origin } catch (e) {}
  var paused = embedded && !(me && me.hasAttribute('data-run'))
  var played = !paused          // the child already tapped Play once
  var hooks = []

  /* the clock */
  var N = {
    setTimeout: window.setTimeout.bind(window), clearTimeout: window.clearTimeout.bind(window),
    raf: window.requestAnimationFrame.bind(window), caf: window.cancelAnimationFrame.bind(window),
    now: performance.now.bind(performance),
  }
  var lost = 0, stoppedAt = paused ? N.now() : 0      // lost = time spent paused
  function now() { return (paused ? stoppedAt : N.now()) - lost }
  try { performance.now = now } catch (e) {}

  var ids = 1e6, timers = new Map(), frames = new Map()     // our own ids, far above the browser's
  function arm(t) {
    t.from = N.now()
    t.native = N.setTimeout(function () {
      t.native = null
      if (t.every != null) { t.left = t.every; arm(t) } else timers.delete(t.id)
      t.fn.apply(window, t.args)
    }, t.left)
  }
  function timer(fn, ms, args, repeat) {
    ms = Math.max(0, Number(ms) || 0)
    var t = { id: ++ids, fn: typeof fn === 'function' ? fn : function () {}, args: args, left: ms, every: repeat ? Math.max(4, ms) : null, native: null }
    timers.set(t.id, t)
    if (!paused) arm(t)
    return t.id
  }
  function clear(id) {
    var t = timers.get(id)
    if (!t) { N.clearTimeout(id); return }
    if (t.native != null) N.clearTimeout(t.native)
    timers.delete(id)
  }
  window.setTimeout = function (fn, ms) { return timer(fn, ms, [].slice.call(arguments, 2), false) }
  window.setInterval = function (fn, ms) { return timer(fn, ms, [].slice.call(arguments, 2), true) }
  window.clearTimeout = window.clearInterval = clear

  // a frozen game still draws for a moment after loading and after its size changes (its picture must be right)
  var drawUntil = N.now() + 4000
  function frame(f) {
    f.native = N.raf(function () { f.native = null; frames.delete(f.id); f.fn(now()) })
  }
  window.requestAnimationFrame = function (fn) {
    var f = { id: ++ids, fn: fn, native: null }
    frames.set(f.id, f)
    if (!paused || N.now() < drawUntil) frame(f)
    return f.id
  }
  window.cancelAnimationFrame = function (id) {
    var f = frames.get(id)
    if (!f) { N.caf(id); return }
    if (f.native != null) N.caf(f.native)
    frames.delete(id)
  }
  function wakeFrames() { Array.from(frames.values()).forEach(function (f) { if (f.native == null) frame(f) }) }
  window.addEventListener('resize', function () { if (paused) { drawUntil = Math.max(drawUntil, N.now() + 600); wakeFrames() } })

  /* CSS and Web animations: before the first Play they run freely (they are silent), later they stop in the middle */
  var stopped = []
  var css = document.createElement('style')
  css.textContent = '.kidodo-paused *,.kidodo-paused *::before,.kidodo-paused *::after{animation-play-state:paused!important}'
  ;(document.head || document.documentElement).appendChild(css)
  function stopAnimations() {
    document.documentElement.classList.add('kidodo-paused')     // CSS animations
    try {
      stopped = document.getAnimations().filter(function (a) { return a.playState === 'running' && !a.animationName })   // Web animations and transitions
      stopped.forEach(function (a) { a.pause() })
    } catch (e) { stopped = [] }
  }
  function goAnimations() {
    document.documentElement.classList.remove('kidodo-paused')
    stopped.forEach(function (a) { try { if (a.playState === 'paused') a.play() } catch (e) {} })
    stopped = []
  }

  /* sound: every Web Audio context of the game sleeps while it is paused, and so does <audio> / <video> */
  var contexts = [], media = []
  ;['AudioContext', 'webkitAudioContext'].forEach(function (name) {
    var Real = window[name]
    if (!Real || Real.kidodo) return
    var resume = Real.prototype.resume
    function Ctx(opts) {
      var c = opts ? new Real(opts) : new Real()
      c.resume = function () { return paused ? Promise.resolve() : resume.call(c) }
      contexts.push(c)
      if (paused) c.suspend().catch(function () {})
      return c
    }
    Ctx.prototype = Real.prototype
    Ctx.kidodo = true
    window[name] = Ctx
  })
  function stopAudio() {
    contexts = contexts.filter(function (c) { return c.state !== 'closed' })
    contexts.forEach(function (c) { c.suspend().catch(function () {}) })
    media = Array.from(document.querySelectorAll('audio,video')).filter(function (m) { return !m.paused })
    media.forEach(function (m) { m.pause() })
  }
  function goAudio() {
    contexts.forEach(function (c) { if (c.state !== 'closed') c.resume().catch(function () {}) })
    media.forEach(function (m) { m.play().catch(function () {}) })
    media = []
  }

  /* speech: while paused nothing is said; what was cut, or asked for meanwhile, is said on Play */
  var synth = window.speechSynthesis, S = null, live = [], held = []
  if (synth) {
    S = { speak: synth.speak.bind(synth), cancel: synth.cancel.bind(synth) }
    var speak = function (u) {
      if (paused) { held.push(u); return }
      var off = function () { live = live.filter(function (x) { return x !== u }) }
      live.push(u)
      u.addEventListener('end', off)
      u.addEventListener('error', off)
      S.speak(u)
    }
    var cancel = function () { held = []; live = []; S.cancel() }
    try { var proto = Object.getPrototypeOf(synth); proto.speak = speak; proto.cancel = cancel } catch (e) {}
    if (synth.speak !== speak) try { synth.speak = speak; synth.cancel = cancel } catch (e) {}
  }
  function copy(u) {
    var c = new SpeechSynthesisUtterance(u.text)
    ;['voice', 'lang', 'rate', 'pitch', 'volume', 'onstart', 'onend', 'onerror', 'onboundary'].forEach(function (k) {
      try { if (u[k] != null) c[k] = u[k] } catch (e) {}
    })
    return c
  }
  function stopSpeech() {
    if (!S) return
    held = live.map(copy)
    live.forEach(function (u) { u.onend = u.onerror = u.onboundary = null })   // the game must not think the sentence is over
    live = []
    S.cancel()
  }
  function goSpeech(first) {
    if (!S) return false
    var list = held; held = []
    // inside the tap itself: opens the voice on phones that allow speech only from a tap
    if (first && !list.length) try { var u = new SpeechSynthesisUtterance(' '); u.volume = 0; S.speak(u) } catch (e) {}
    list.forEach(function (x) { synth.speak(x) })
    return list.length > 0
  }
  function silence() { held = []; live = []; if (S) S.cancel() }
  window.addEventListener('pagehide', silence)      // a removed iframe / a closed page: a sentence must not go on by itself

  function pause() {
    if (paused) return
    stoppedAt = N.now()
    paused = true
    drawUntil = 0
    timers.forEach(function (t) {
      if (t.native == null) return
      N.clearTimeout(t.native); t.native = null
      t.left = Math.max(0, t.left - (stoppedAt - t.from))
    })
    frames.forEach(function (f) { if (f.native != null) { N.caf(f.native); f.native = null } })
    stopSpeech(); stopAudio(); stopAnimations()
  }
  function play() {
    if (!paused) return
    var first = !played
    lost += N.now() - stoppedAt
    paused = false; played = true
    goAnimations(); goAudio()
    var saying = goSpeech(first)
    timers.forEach(function (t) { if (t.native == null) arm(t) })
    wakeFrames()
    if (!first && !saying) hooks.forEach(function (fn) { try { fn() } catch (e) {} })
  }

  // a paused game does not listen (the Play button of the course covers it, but not the keyboard)
  ;['keydown', 'keyup', 'pointerdown', 'mousedown', 'touchstart', 'click'].forEach(function (type) {
    window.addEventListener(type, function (e) { if (paused) e.stopImmediatePropagation() }, true)
  })

  // opened alone: stops by itself while the page is hidden. Inside the course, the course decides.
  if (!embedded) document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); else play() })

  window.KidodoPause = { pause: pause, play: play, silence: silence, isPaused: function () { return paused }, onResume: function (fn) { hooks.push(fn) } }
})();

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

  // the course page keeps { look, reward } in localStorage (lib/shop/client.ts) – ready before the first drawing
  var shopKey = 'kidodo-shop:' + ctx.childId
  function shop() {
    try { return (ctx.childId && JSON.parse(localStorage.getItem(shopKey))) || {} } catch (e) { return {} }
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
    // the game leaves its top-left button slot free: the course puts its enlarge / shrink button there (instead of a ✕)
    look: function () { return shop().look || {} },
    onLook: function (fn) { window.addEventListener('storage', function (e) { if (e.key === shopKey) fn(shop().look || {}) }) },
    reward: function () { var r = Number(shop().reward); return r > 0 ? r : 10 },
    onResume: function (fn) { window.KidodoPause.onResume(fn) },
    claimCorner: function () { this.corner = true; if (embedded) tell('corner') },
  }
})()
