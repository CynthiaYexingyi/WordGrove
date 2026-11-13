/* 词林 · 浏览器语音合成（离线 TTS） */
(function () {
  const CILIN = (window.CILIN = window.CILIN || {});
  const synth = window.speechSynthesis || null;
  let voices = [];
  let current = null;

  const PREFER = [
    "Microsoft Aria", "Microsoft Jenny", "Microsoft Emma", "Microsoft Libby",
    "Microsoft Sonia", "Microsoft Guy", "Microsoft Ryan", "Google UK English Female",
    "Google US English", "Samantha", "Daniel", "Karen", "Moira", "Tessa", "Alex"
  ];

  function score(v) {
    let s = 0;
    if (/^en(-|_)(US|GB|AU|CA|NZ|IE|ZA)/i.test(v.lang)) s += 10;
    else if (/^en/i.test(v.lang)) s += 6;
    PREFER.forEach(function (p, i) { if (v.name.indexOf(p) >= 0) s += 40 - i; });
    if (/female|aria|jenny|emma|libby|sonia|samantha|karen|moira|tessa/i.test(v.name)) s += 2;
    if (!v.localService) s += 1; // 在线语音通常更自然，但离线可用性优先
    return s;
  }

  function refresh() {
    if (!synth) return;
    voices = synth.getVoices() || [];
    voices = voices.filter(function (v) { return /^en/i.test(v.lang); })
      .sort(function (a, b) { return score(b) - score(a); });
  }

  const Speech = {
    available: !!synth,
    init: function () {
      if (!synth) return;
      refresh();
      synth.onvoiceschanged = refresh;
      setTimeout(refresh, 120);
      setTimeout(refresh, 800);
    },
    voices: function () { return voices.slice(); },
    preferred: function () {
      const settings = CILIN.store ? CILIN.store.state.settings : {};
      if (settings.voiceName) {
        const hit = voices.find(function (v) { return v.name === settings.voiceName; });
        if (hit) return hit;
      }
      return voices[0] || null;
    },
    stop: function () {
      if (!synth) return;
      try { synth.cancel(); } catch (e) {}
      current = null;
    },
    speak: function (text, opts) {
      opts = opts || {};
      if (!synth || !text) return;
      try { synth.cancel(); } catch (e) {}
      const u = new SpeechSynthesisUtterance(String(text));
      const v = this.preferred();
      if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = "en-US"; }
      const base = CILIN.store ? CILIN.store.state.settings.rate : 0.9;
      u.rate = opts.rate || base || 0.9;
      u.pitch = opts.pitch || 1;
      u.volume = 1;
      u.onstart = function () { if (opts.onstart) opts.onstart(); };
      u.onend = function () { current = null; if (opts.onend) opts.onend(); };
      u.onerror = function (e) {
        current = null;
        if (opts.onerror) opts.onerror(e);
      };
      current = u;
      synth.speak(u);
    },
    word: function (w, opts) {
      opts = opts || {};
      this.speak(opts.slow ? w + ". " + w : w, { rate: opts.slow ? 0.62 : 0.82, onend: opts.onend });
    },
    sentence: function (text, opts) {
      opts = opts || {};
      this.speak(text, { rate: opts.slow ? 0.68 : 0.9, onend: opts.onend });
    },
    hasEnglish: function () { return voices.length > 0; }
  };

  CILIN.speech = Speech;
  window.addEventListener("load", function () { Speech.init(); });
})();
