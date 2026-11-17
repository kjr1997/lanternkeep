// Lanternkeep — warm, airy WebAudio sound module.
// Pure synthesis: no audio files, no network. ES module.
// Usage: const audio = createAudio(); audio.unlock() on first user gesture.
// Before unlock() (or if AudioContext is unavailable) every method is a no-op.

// Pentatonic scale (C major pentatonic, C4–A5) for plucks and melodies.
const PENTA = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];
// Slow pad chords: Am, F, C, G (root-position triads, Hz).
const CHORDS = [
  [220.0, 261.63, 329.63],
  [174.61, 220.0, 261.63],
  [261.63, 329.63, 392.0],
  [196.0, 246.94, 293.66],
];

export function createAudio() {
  let ctx = null;
  let master = null, sfxBus = null, musicBus = null, noiseBuf = null;
  let muted = false;
  let musicOn = true, musicTimer = null;
  let nextPluckTime = 0, pluckStep = 0, chordIndex = 0;
  let padOscs = [], padGain = null;
  let windSrc = null, windGain = null, windLfo = null, windLfoGain = null;

  const ready = () => !!ctx;

  function getNoiseBuffer() {
    if (noiseBuf) return noiseBuf;
    const len = ctx.sampleRate;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }

  // Short enveloped oscillator tone. Never throws.
  function tone(o) {
    if (!ctx || !sfxBus) return;
    const { freq = 440, freqEnd = null, dur = 0.2, type = "sine", vol = 0.2,
      attack = 0.005, when = 0, dest = null, detune = 0 } = o || {};
    try {
      const t0 = ctx.currentTime + Math.max(0, when);
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(20, freq), t0);
      if (freqEnd !== null && freqEnd !== freq)
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
      if (detune) osc.detune.value = detune;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain); gain.connect(dest || sfxBus);
      osc.start(t0); osc.stop(t0 + dur + 0.05);
    } catch (e) { /* silent by design */ }
  }

  // Filtered noise burst (wind, impacts, explosions). Never throws.
  function noiseHit(o) {
    if (!ctx || !sfxBus) return;
    const { dur = 0.2, vol = 0.2, filterFreq = 1200, filterType = "lowpass",
      when = 0, dest = null, q = 0.8 } = o || {};
    try {
      const t0 = ctx.currentTime + Math.max(0, when);
      const src = ctx.createBufferSource();
      src.buffer = getNoiseBuffer(); src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = filterType; filter.frequency.value = filterFreq; filter.Q.value = q;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(filter); filter.connect(gain); gain.connect(dest || sfxBus);
      src.start(t0); src.stop(t0 + dur + 0.05);
    } catch (e) { /* silent by design */ }
  }

  // Warm bell: sine fundamental + quiet octave / twelfth shimmer.
  function bell(freq, dur, vol, when, dest) {
    tone({ freq, dur, type: "sine", vol, attack: 0.004, when: when || 0, dest });
    tone({ freq: freq * 2, dur: Math.max(0.05, dur * 0.45), type: "sine",
      vol: vol * 0.22, attack: 0.004, when: when || 0, dest });
    tone({ freq: freq * 3.01, dur: Math.max(0.04, dur * 0.22), type: "sine",
      vol: vol * 0.07, attack: 0.004, when: when || 0, dest });
  }

  function unlock() {
    try {
      if (!ctx) {
        const AC = typeof window !== "undefined"
          ? window.AudioContext || window.webkitAudioContext : null;
        if (!AC) return;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = muted ? 0 : 0.9;
        master.connect(ctx.destination);
        sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
        musicBus = ctx.createGain(); musicBus.gain.value = 0.5; musicBus.connect(master);
      }
      if (ctx.state === "suspended") {
        const p = ctx.resume();
        if (p && typeof p.catch === "function") p.catch(() => {});
      }
    } catch (e) { ctx = null; }
  }

  function setMuted(m) {
    muted = !!m;
    try { if (master) master.gain.value = muted ? 0 : 0.9; } catch (e) { /* silent */ }
  }
  function isMuted() { return muted; }

  // --- SFX ---
  function shoot() {
    if (!ready()) return;
    bell(987.77, 0.16, 0.14);
    tone({ freq: 1318.5, freqEnd: 659.25, dur: 0.1, type: "triangle", vol: 0.06 });
    noiseHit({ dur: 0.05, vol: 0.03, filterFreq: 5200, filterType: "highpass" });
  }
  function hit() {
    if (!ready()) return;
    tone({ freq: 190, freqEnd: 90, dur: 0.09, type: "triangle", vol: 0.22 });
    noiseHit({ dur: 0.07, vol: 0.14, filterFreq: 900 });
    bell(523.25, 0.08, 0.05);
  }
  function explode(big) {
    if (!ready()) return;
    const s = big ? 1 : 0.6;
    noiseHit({ dur: 0.55 * s + 0.25, vol: 0.28 * s + 0.08, filterFreq: 700 });
    noiseHit({ dur: 0.25, vol: 0.12, filterFreq: 3200, filterType: "bandpass", q: 1.2 });
    tone({ freq: 140, freqEnd: 36, dur: 0.5 * s + 0.2, type: "sine", vol: 0.32 });
    tone({ freq: 70, freqEnd: 30, dur: 0.6 * s + 0.2, type: "triangle", vol: 0.18 });
    if (big) { bell(392.0, 0.9, 0.08, 0.08); bell(261.63, 1.1, 0.06, 0.22); }
  }
  function hurt() {
    if (!ready()) return;
    // Dull low thud with a cold edge — the lantern flickers.
    tone({ freq: 220, freqEnd: 98, dur: 0.28, type: "sawtooth", vol: 0.09 });
    tone({ freq: 233, freqEnd: 104, dur: 0.28, type: "sawtooth", vol: 0.07 });
    tone({ freq: 110, freqEnd: 55, dur: 0.3, type: "triangle", vol: 0.2 });
    noiseHit({ dur: 0.12, vol: 0.1, filterFreq: 500 });
  }
  function pickup() {
    if (!ready()) return;
    bell(523.25, 0.3, 0.13, 0); bell(659.25, 0.3, 0.13, 0.06); bell(783.99, 0.42, 0.14, 0.12);
  }
  function waveHorn() {
    if (!ready()) return;
    // Warm two-note horn swell, like a distant lantern bell.
    tone({ freq: 392.0, dur: 0.9, type: "triangle", vol: 0.12, attack: 0.18 });
    tone({ freq: 587.33, dur: 0.9, type: "triangle", vol: 0.08, attack: 0.18 });
    tone({ freq: 392.0, dur: 0.9, type: "sine", vol: 0.1, attack: 0.2, detune: 4 });
    bell(783.99, 0.6, 0.06, 0.35);
  }
  function gameOver() {
    if (!ready()) return;
    [392.0, 329.63, 261.63, 196.0].forEach((f, i) => bell(f, 0.7, 0.13, i * 0.32));
    tone({ freq: 98, freqEnd: 49, dur: 1.6, type: "sine", vol: 0.16, attack: 0.05, when: 0.1 });
    noiseHit({ dur: 1.2, vol: 0.04, filterFreq: 400, when: 0.2 });
  }
  function victory() {
    if (!ready()) return;
    [261.63, 329.63, 392.0, 523.25, 659.25, 783.99].forEach((f, i) => bell(f, 0.55, 0.13, i * 0.09));
    bell(1046.5, 1.1, 0.12, 0.58); bell(1318.5, 0.9, 0.06, 0.66);
  }
  function click() {
    if (!ready()) return;
    tone({ freq: 1250, freqEnd: 900, dur: 0.045, type: "sine", vol: 0.1 });
    tone({ freq: 2500, dur: 0.03, type: "sine", vol: 0.03 });
  }
  function upgrade() {
    if (!ready()) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(f, 0.4, 0.11, i * 0.07));
    noiseHit({ dur: 0.35, vol: 0.03, filterFreq: 6000, filterType: "highpass", when: 0.05 });
    bell(1567.98, 0.7, 0.05, 0.32);
  }

  // --- Generative music: pentatonic plucks + soft pad + wind ---
  function stopPad() {
    padOscs.forEach((osc) => {
      try { osc.stop(); } catch (e) { /* already stopped */ }
      try { osc.disconnect(); } catch (e) { /* already disconnected */ }
    });
    padOscs = [];
    if (padGain) { try { padGain.disconnect(); } catch (e) { /* silent */ } padGain = null; }
  }
  function startPad() {
    try {
      stopPad();
      padGain = ctx.createGain();
      padGain.gain.value = 0;
      padGain.gain.setTargetAtTime(0.055, ctx.currentTime, 1.2);
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass"; filter.frequency.value = 900; filter.Q.value = 0.4;
      padGain.connect(filter); filter.connect(musicBus);
      padOscs = CHORDS[chordIndex % CHORDS.length].map((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = i === 0 ? "sine" : "triangle";
        osc.frequency.value = freq;
        osc.detune.value = i === 1 ? 4 : i === 2 ? -3 : 0;
        osc.connect(padGain); osc.start();
        return osc;
      });
    } catch (e) { /* silent */ }
  }
  function retunePad() {
    if (!padOscs.length) return;
    try {
      chordIndex = (chordIndex + 1) % CHORDS.length;
      const chord = CHORDS[chordIndex], t = ctx.currentTime;
      padOscs.forEach((osc, i) => osc.frequency.setTargetAtTime(chord[i], t, 1.5));
    } catch (e) { /* silent */ }
  }
  function stopWind() {
    [windSrc, windLfo].forEach((node) => {
      if (!node) return;
      try { node.stop(); } catch (e) { /* already stopped */ }
      try { node.disconnect(); } catch (e) { /* silent */ }
    });
    windSrc = null; windLfo = null;
    if (windLfoGain) { try { windLfoGain.disconnect(); } catch (e) { /* silent */ } windLfoGain = null; }
    if (windGain) { try { windGain.disconnect(); } catch (e) { /* silent */ } windGain = null; }
  }
  function startWind() {
    try {
      stopWind();
      const src = ctx.createBufferSource();
      src.buffer = getNoiseBuffer(); src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass"; filter.frequency.value = 320;
      windGain = ctx.createGain(); windGain.gain.value = 0.018;
      windLfo = ctx.createOscillator(); windLfo.type = "sine"; windLfo.frequency.value = 0.07;
      windLfoGain = ctx.createGain(); windLfoGain.gain.value = 0.009;
      windLfo.connect(windLfoGain); windLfoGain.connect(windGain.gain);
      src.connect(filter); filter.connect(windGain); windGain.connect(musicBus);
      src.start(); windLfo.start(); windSrc = src;
    } catch (e) { /* silent */ }
  }
  function schedulePluck(when) {
    if (!ctx || !musicBus) return;
    try {
      // Bias toward the middle of the scale; occasionally leap high.
      const r = Math.random();
      let idx;
      if (r < 0.55) idx = 2 + Math.floor(Math.random() * 4);
      else if (r < 0.85) idx = Math.floor(Math.random() * 6);
      else idx = 6 + Math.floor(Math.random() * 4);
      const freq = PENTA[Math.min(idx, PENTA.length - 1)];
      const offset = when - ctx.currentTime;
      bell(freq, 1.6 + Math.random() * 0.9, 0.05 + Math.random() * 0.035, offset, musicBus);
      if (Math.random() < 0.25) bell(freq / 2, 2.0, 0.03, offset, musicBus); // soft fifth below
    } catch (e) { /* silent */ }
  }
  // Lookahead scheduler: every 60 ms, schedule plucks up to 0.25 s ahead.
  function musicTick() {
    if (!ctx) return;
    try {
      const ahead = ctx.currentTime + 0.25;
      while (nextPluckTime < ahead) {
        schedulePluck(nextPluckTime);
        pluckStep += 1;
        if (pluckStep % 16 === 0) retunePad(); // new chord roughly every ~9 s
        nextPluckTime += 0.45 + Math.random() * 0.4; // gentle, irregular rhythm
      }
    } catch (e) { /* silent */ }
  }
  function startMusic() {
    musicOn = true;
    if (!ready() || musicTimer !== null) return;
    try {
      nextPluckTime = ctx.currentTime + 0.15; pluckStep = 0;
      startPad(); startWind();
      musicTimer = setInterval(musicTick, 60);
      musicTick();
    } catch (e) { musicTimer = null; }
  }
  function stopMusic() {
    musicOn = false;
    if (musicTimer !== null) { clearInterval(musicTimer); musicTimer = null; }
    try { stopPad(); stopWind(); } catch (e) { /* silent */ }
  }
  function setMusicOn(on) {
    if (on) { musicOn = true; startMusic(); } else stopMusic();
  }

  return {
    unlock, setMuted, isMuted, shoot, hit, explode, hurt, pickup,
    waveHorn, gameOver, victory, click, upgrade,
    startMusic, stopMusic, setMusicOn,
  };
}
