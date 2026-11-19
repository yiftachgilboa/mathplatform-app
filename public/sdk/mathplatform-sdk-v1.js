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

    emit: function(event, data) {
      console.log('[MathPlatformSDK]', event, data);

      if (event === 'GAME_STARTED') {
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
      }).catch(err => console.error('[MathPlatformSDK] Error:', err))
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
