(function() {
  const SDK = {
    childId: null,
    gameId: null,
    course: null,

    init: function() {
      const params = new URLSearchParams(window.location.search);
      this.childId = params.get('childId');
      // משחק שנפתח מתוך אתר הקורס: ?courseId=&lessonId=&courseStage=
      const courseId = params.get('courseId');
      const lessonId = params.get('lessonId');
      const stage = parseInt(params.get('courseStage') || '0');
      this.course = courseId && lessonId && stage ? { courseId: courseId, lessonId: lessonId, stage: stage } : null;
    },

    // בקורס: כמה מטבעות הרווחנו, מעל מסך הסיום של המשחק (null = להסיר)
    coins: function(n) {
      let el = document.getElementById('kidodo-coins');
      if (typeof n !== 'number') { if (el) el.remove(); return; }
      if (!el) { el = document.createElement('div'); el.id = 'kidodo-coins'; document.body.appendChild(el); }
      el.dir = 'ltr';
      el.setAttribute('aria-label', n + ' מטבעות');
      el.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:9999;pointer-events:none;display:flex;align-items:center;gap:8px;font:700 28px Rubik,system-ui,sans-serif;color:#9B6A00;background:rgba(255,255,255,.95);border-radius:24px;padding:5px 18px 5px 7px;box-shadow:0 4px 12px rgba(0,0,0,.2)';
      el.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24"><polygon points="12,1 17.5,2.5 21.5,6.5 23,12 21.5,17.5 17.5,21.5 12,23 6.5,21.5 2.5,17.5 1,12 2.5,6.5 6.5,2.5" fill="#cf981b"/><polygon points="12,3.6 18,6 20.4,12 18,18 12,20.4 6,18 3.6,12 6,6" fill="#f1c43e"/><polygon points="12,3.6 18,6 20.4,12 12,12" fill="#fff0a0"/></svg><span>+' + n + '</span>';
    },

    emit: function(event, data) {
      console.log('[MathPlatformSDK]', event, data);

      if (event === 'GAME_STARTED') {
        this.coins(null);
        this.gameId = data.gameId;
        this.init();
      }

      if (!this.childId) return;

      if (event === 'GAME_OVER') {
        const today = new Date().toISOString().split('T')[0];
        const dateKey = 'completedToday_' + this.childId + '_' + today;
        if (this.gameId === 'surprise-coins-001') {
          localStorage.setItem(dateKey, '0');
        } else {
          const current = parseInt(localStorage.getItem(dateKey) || '0');
          const newCount = Math.min(current + 1, 3);
          localStorage.setItem(dateKey, newCount.toString());

          if (data && data.stars > 0) {
            const dailyStarsKey = 'dailyStars_' + this.childId + '_' + this.gameId + '_' + today;
            localStorage.setItem(dailyStarsKey, String(data.stars));
          }

          if (newCount >= 3) {
            const d = new Date();
            const jan1 = new Date(d.getFullYear(), 0, 1);
            const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
            const weekKey = 'weekProgress_' + this.childId + '_' + d.getFullYear() + '-W' + String(week).padStart(2, '0');
            const day = d.getDay();
            let days = [];
            try { days = JSON.parse(localStorage.getItem(weekKey) || '[]'); } catch {}
            if (!days.includes(day)) {
              days.push(day);
              localStorage.setItem(weekKey, JSON.stringify(days));
            }
          }
        }
      }

      fetch('/api/sdk/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          childId: this.childId,
          gameId: this.gameId,
          data,
          course: this.course,
          timestamp: new Date().toISOString()
        })
      }).then(r => (event === 'GAME_OVER' && this.tell && r.ok ? r.json().then(j => this.coins(j.coins)).catch(() => {}) : null))
        .catch(err => console.error('[MathPlatformSDK] Error:', err))
        .then(() => { if (event === 'GAME_OVER' && this.tell) this.tell('complete') });
      if (event === 'GAME_OVER') this.over = true;
    }
  };

  // משחק שמוצג בתוך שלב בקורס (iframe מאותו אתר, עם ?courseStage=):
  // לא מנווטים את העמוד — מודיעים לקורס. "חזרה" (router.back) = exit, ואחרי סוף המשחק = next.
  // בסוף משחק, אחרי שהשרת שמר, שולחים complete כדי שהקורס יסמן ✓ וירענן.
  try {
    const qs = new URLSearchParams(window.location.search);
    const embedded = window.parent !== window && window.parent.location.origin === window.location.origin;
    if (embedded && qs.get('courseStage')) {
      const tell = function(a) { try { window.parent.postMessage({ kidodo: a }, window.location.origin) } catch (e) {} };
      SDK.tell = tell;
      window.history.back = function() { tell(SDK.over ? 'next' : 'exit') };
    }
  } catch (e) {}

  window.MathPlatformSDK = SDK;
})();
