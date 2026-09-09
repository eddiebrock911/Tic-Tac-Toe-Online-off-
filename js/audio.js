/* TICKIT — Audio System with Settings */
(function () {
  let _audioCtx = null;

  function getSettings() {
    return TICKIT.Storage.getSettings();
  }

  function getAudioCtx() {
    if (!_audioCtx || _audioCtx.state === 'closed') {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      _audioCtx = new AC();
    }
    if (_audioCtx.state === 'suspended') _audioCtx.resume();
    return _audioCtx;
  }

  TICKIT.Audio = {
    play(type) {
      if (!getSettings().sound) return;
      try {
        const ctx = getAudioCtx();
        if (!ctx) return;

        const playTone = (freq, start, duration, oscType = 'sine') => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = oscType;
          osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
          gain.gain.setValueAtTime(0.08, ctx.currentTime + start);
          gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + start + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + start);
          osc.stop(ctx.currentTime + start + duration);
        };

        if (type === 'click') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(400, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.06);
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.06);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.06);
        } else if (type === 'pop') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(550, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.08);
          gain.gain.setValueAtTime(0.06, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.08);
        } else if (type === 'win') {
          playTone(523.25, 0, 0.12);
          playTone(659.25, 0.08, 0.12);
          playTone(783.99, 0.16, 0.12);
          playTone(1046.50, 0.24, 0.35);
        } else if (type === 'lose') {
          playTone(392, 0, 0.12, 'sawtooth');
          playTone(369.99, 0.1, 0.12, 'sawtooth');
          playTone(349.23, 0.2, 0.12, 'sawtooth');
          playTone(329.63, 0.3, 0.35, 'sawtooth');
        } else if (type === 'draw') {
          playTone(300, 0, 0.1, 'triangle');
          playTone(300, 0.12, 0.15, 'triangle');
        } else if (type === 'chat') {
          playTone(880, 0, 0.05);
        }
      } catch (e) {
        console.warn('Audio error:', e);
      }
    },

    resumeOnInteraction() {
      document.addEventListener('click', () => {
        const ctx = getAudioCtx();
        if (ctx && ctx.state === 'suspended') ctx.resume();
      }, { once: true });
    }
  };
})();
