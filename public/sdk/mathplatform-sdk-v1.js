(function() {
  const SDK = {
    childId: null,
    gameId: null,

    init: function() {
      const params = new URLSearchParams(window.location.search);
      this.childId = params.get('childId');
    },

    emit: function(event, data) {
      console.log('[MathPlatformSDK]', event, data);

      if (event === 'GAME_STARTED') {
        this.gameId = data.gameId;
        this.init();
      }

      if (!this.childId) return;

      if (event === 'GAME_OVER') {
        const dateKey = 'completedToday_' + this.childId + '_' + new Date().toISOString().split('T')[0];
        if (this.gameId === 'surprise-coins-001') {
          localStorage.setItem(dateKey, '0');
        } else {
          const current = parseInt(localStorage.getItem(dateKey) || '0');
          localStorage.setItem(dateKey, Math.min(current + 1, 3).toString());
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
          timestamp: new Date().toISOString()
        })
      }).catch(err => console.error('[MathPlatformSDK] Error:', err));
    }
  };

  window.MathPlatformSDK = SDK;
})();
