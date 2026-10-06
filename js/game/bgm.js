/*
 * CHALK MAN BGM（音楽ファイルは使わず、ブラウザの中で演奏する。しくみは DUST DASH と同じ）
 * ・曲は「16分音符ずつの升目」に音名を並べた楽譜で書く
 *     'C5'  … その升目でド（5オクターブ目）を鳴らす　'-' … 前の音をのばす　'.' … 休み　'C4+E4+G4' … 和音
 *   打楽器は k（バスドラム）・s（リムショット）・h（シェイカー）・t（時計のチク）・o（時計のタク）
 * ・考えながら遊ぶゲームなので、DUST DASH より小さく、やわらかい音にしている
 *
 *   classroom … タイトル・プロローグ・第1章（放課後の教室。木琴でのんびり）
 *   sky       … 第2章・空ルート（ふわっと明るい。鉄琴のアルペジオ）
 *   under     … 第2章・地下ルート（ぽこぽこした低い木琴）
 *   dawn      … 第3章（時計のチクタク。8時が近づくと速くなる：setTempo）
 *   ending    … エンディング（あたたかい曲）
 *
 *   var bgm = CM.createBgm(sound, store);
 *   bgm.play('sky');  bgm.setTempo(1.2);  bgm.stop(1.0);
 *   bgm.enabled = false;   // BGM だけ消す（効果音は鳴る）。セーブに覚える
 */
(function (global) {
  'use strict';
  var CM = global.CM = global.CM || {};

  var NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function freq(name) {
    var m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
    if (!m) return null;
    var n = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (parseInt(m[3], 10) + 1) * 12;
    return 440 * Math.pow(2, (n - 69) / 12);
  }
  /** 楽譜の文字列を「升目ごとの出来事」の配列にする */
  function parse(score) {
    var tok = score.replace(/\|/g, ' ').trim().split(/\s+/);
    var out = [];
    for (var i = 0; i < tok.length; i++) {
      var t = tok[i];
      if (t === '-' || t === '.') { out.push(null); continue; }
      var len = 1;
      while (tok[i + len] === '-') len++;
      if (/^[kshto]+$/.test(t)) { out.push({ drum: t, len: 1 }); continue; }
      out.push({ notes: t.split('+').map(freq), len: len });
    }
    return out;
  }
  function rep(s, n) { var a = []; for (var i = 0; i < n; i++) a.push(s); return a.join(' | '); }
  function hold(ch) { return ch + ' - - - - - - - - - - - - - - -'; }
  /** 和音の音を、8分音符で上り下りする */
  function arp(a, b, c, d) { return [a, '.', b, '.', c, '.', d, '.', c, '.', b, '.', c, '.', b, '.'].join(' '); }

  var TRACKS = {
    // ---- 放課後の教室：C → Am → F → G。木琴のメロディと、ピチカートのベース ----
    classroom: {
      bpm: 104,
      parts: [
        { inst: 'bass', score: ['C3 . . . . . . . G2 . . . C3 . . .', 'A2 . . . . . . . E2 . . . A2 . . .', 'F2 . . . . . . . C3 . . . F2 . . .', 'G2 . . . . . . . D3 . . . G2 . . .',
                                'C3 . . . . . . . G2 . . . C3 . . .', 'A2 . . . . . . . E2 . . . A2 . . .', 'D3 . . . . . . . A2 . . . D3 . . .', 'G2 . . . . . . . D3 . . . B2 . . .'].join(' | ') },
        { inst: 'marimba', score: 'E5 . G5 . C6 . G5 . E5 . D5 . C5 . . . | A4 . C5 . E5 . C5 . A4 . B4 . C5 . . . | F4 . A4 . C5 . F5 . E5 . D5 . C5 . A4 . | G4 . B4 . D5 . G5 . F5 . D5 . B4 . . . | ' +
                                   'E5 . . G5 E5 . C5 . D5 . . E5 D5 . C5 . | C5 . . E5 C5 . A4 . B4 . . C5 B4 . A4 . | F5 . E5 . D5 . C5 . A4 . C5 . D5 . F5 . | E5 - - - D5 - - - B4 - - - G4 . . .' },
        { inst: 'glock', score: 'C6 . . . . . . . . . . . . . . . | . . . . . . . . . . . . E6 . . . | A5 . . . . . . . . . . . . . . . | . . . . . . . . . . . . D6 . . . | ' +
                                 'G6 . . . . . . . . . . . . . . . | . . . . . . . . E6 . . . . . . . | F6 . . . . . . . . . . . . . . . | . . . . . . . . . . . . G5 . . .' },
        { inst: 'pad', score: ['C4+E4+G4', 'A3+C4+E4', 'F3+A3+C4', 'G3+B3+D4', 'C4+E4+G4', 'A3+C4+E4', 'D4+F4+A4', 'G3+B3+D4'].map(hold).join(' | ') },
        { inst: 'drum', score: rep('k . . . h . . . s . . . h . . h', 8) }
      ]
    },
    // ---- 空ルート：F → Dm → B♭ → C。鉄琴のアルペジオと、ふわっとした笛 ----
    sky: {
      bpm: 88,
      parts: [
        { inst: 'bass', score: ['F2', 'D2', 'Bb2', 'C3', 'F2', 'D2', 'Bb2', 'C3'].map(hold).join(' | ') },
        { inst: 'glock', score: [arp('F5', 'A5', 'C6', 'F6'), arp('D5', 'F5', 'A5', 'D6'), arp('Bb4', 'D5', 'F5', 'Bb5'), arp('C5', 'E5', 'G5', 'C6'),
                                 arp('F5', 'A5', 'C6', 'F6'), arp('D5', 'F5', 'A5', 'D6'), arp('Bb4', 'D5', 'F5', 'Bb5'), arp('C5', 'E5', 'G5', 'C6')].join(' | ') },
        { inst: 'soft', score: 'A5 - - - - - - - C6 - - - A5 - - - | F5 - - - - - - - D5 - - - F5 - - - | D5 - - - F5 - - - Bb5 - - - A5 - - - | G5 - - - - - - - - - - - . . . . | ' +
                                'A5 - - - C6 - - - F6 - - - E6 - - - | D6 - - - C6 - - - A5 - - - F5 - - - | F5 - - - G5 - - - A5 - - - Bb5 - - - | C6 - - - - - - - E5 - - - G5 - - -' },
        { inst: 'pad', score: ['F3+A3+C4', 'D3+F3+A3', 'Bb3+D4+F4', 'C4+E4+G4', 'F3+A3+C4', 'D3+F3+A3', 'Bb3+D4+F4', 'C4+E4+G4'].map(hold).join(' | ') },
        { inst: 'drum', score: rep('. . h . . . h . . . h . . . h .', 8) }
      ]
    },
    // ---- 地下ルート：Dm → G のくり返し（ちょっととぼけた感じ）。ぽこぽこした低い木琴 ----
    under: {
      bpm: 112,
      parts: [
        { inst: 'pbass', score: ['D2 . D3 . A2 . D3 . D2 . D3 . A2 . C3 .', 'G2 . G3 . D3 . G3 . G2 . G3 . D3 . F3 .', 'D2 . D3 . A2 . D3 . D2 . D3 . A2 . C3 .', 'G2 . G3 . D3 . G3 . G2 . G3 . D3 . F3 .',
                                 'Bb2 . Bb3 . F3 . Bb3 . Bb2 . Bb3 . F3 . A3 .', 'C3 . C4 . G3 . C4 . C3 . C4 . G3 . Bb3 .', 'D2 . D3 . A2 . D3 . D2 . D3 . A2 . C3 .', 'A2 . A3 . E3 . A3 . A2 . E3 . C#3 . E3 .'].join(' | ') },
        { inst: 'marimba', score: 'D4 . F4 A4 . . G4 . F4 . E4 . D4 . . . | B3 . D4 G4 . . F4 . E4 . D4 . B3 . . . | D4 . F4 A4 . . C5 . A4 . G4 . F4 . A4 . | G4 - - - F4 . E4 . D4 . . . . . . . | ' +
                                   'F4 . Bb4 D5 . . C5 . Bb4 . A4 . G4 . . . | E4 . G4 C5 . . Bb4 . A4 . G4 . E4 . . . | F4 . A4 D5 . . E5 . F5 . E5 . D5 . C5 . | C#5 - - - A4 - - - E4 - - - A3 . . .' },
        { inst: 'drum', score: rep('k . . h . . k . . . h . k . h .', 8) }
      ]
    },
    // ---- 第3章：Dm → B♭ → Gm → A。時計のチクタクと、せかすような8分音符 ----
    dawn: {
      bpm: 116,
      parts: [
        { inst: 'bass', score: ['D2 - - - - - - - D2 - - - - - - -', 'Bb1 - - - - - - - Bb1 - - - - - - -', 'G1 - - - - - - - G1 - - - - - - -', 'A1 - - - - - - - A1 - - - - - - -',
                                'D2 - - - - - - - D2 - - - - - - -', 'Bb1 - - - - - - - Bb1 - - - - - - -', 'G1 - - - - - - - G1 - - - - - - -', 'A1 - - - - - - - A1 - - - E2 - - -'].join(' | ') },
        { inst: 'pluck', score: [arp('D4', 'F4', 'A4', 'D5'), arp('Bb3', 'D4', 'F4', 'Bb4'), arp('G3', 'Bb3', 'D4', 'G4'), arp('A3', 'C#4', 'E4', 'A4'),
                                 arp('D4', 'F4', 'A4', 'D5'), arp('Bb3', 'D4', 'F4', 'Bb4'), arp('G3', 'Bb3', 'D4', 'G4'), arp('A3', 'C#4', 'E4', 'A4')].join(' | ') },
        { inst: 'soft', score: 'A4 - - - - - - - D5 - - - - - - - | F5 - - - - - - - D5 - - - - - - - | G5 - - - F5 - - - D5 - - - Bb4 - - - | A4 - - - - - - - C#5 - - - E5 - - - | ' +
                                'F5 - - - E5 - - - D5 - - - A4 - - - | Bb4 - - - D5 - - - F5 - - - D5 - - - | D5 - - - Bb4 - - - G4 - - - Bb4 - - - | A4 - - - - - - - . . . . . . . .' },
        { inst: 'drum', score: rep('kt . . . o . . . kt . . . o . . .', 8) }
      ]
    },
    // ---- エンディング：C → G → Am → F。あたたかい長調 ----
    ending: {
      bpm: 92,
      parts: [
        { inst: 'bass', score: ['C3 . . . . . . . G2 . . . . . . .', 'G2 . . . . . . . D3 . . . . . . .', 'A2 . . . . . . . E3 . . . . . . .', 'F2 . . . . . . . C3 . . . . . . .',
                                'C3 . . . . . . . G2 . . . . . . .', 'G2 . . . . . . . D3 . . . . . . .', 'F2 . . . . . . . G2 . . . . . . .', 'C3 - - - - - - - . . . . . . . .'].join(' | ') },
        { inst: 'glock', score: [arp('C5', 'E5', 'G5', 'C6'), arp('B4', 'D5', 'G5', 'B5'), arp('A4', 'C5', 'E5', 'A5'), arp('F4', 'A4', 'C5', 'F5'),
                                 arp('C5', 'E5', 'G5', 'C6'), arp('B4', 'D5', 'G5', 'B5'), arp('A4', 'C5', 'F5', 'A5'), 'C6 - - - - - - - . . . . . . . .'].join(' | ') },
        { inst: 'soft', score: 'E5 - - - G5 - - - C6 - - - - - - - | B5 - - - A5 - - - G5 - - - - - - - | A5 - - - G5 - - - E5 - - - C5 - - - | F5 - - - - - - - A5 - - - - - - - | ' +
                                'G5 - - - E5 - - - C5 - - - E5 - - - | D5 - - - G5 - - - B5 - - - D6 - - - | C6 - - - A5 - - - F5 - - - A5 - - - | C6 - - - - - - - - - - - . . . .' },
        { inst: 'pad', score: ['C4+E4+G4', 'B3+D4+G4', 'A3+C4+E4', 'F3+A3+C4', 'C4+E4+G4', 'B3+D4+G4', 'F3+A3+C4', 'C4+E4+G4'].map(hold).join(' | ') },
        { inst: 'drum', score: rep('k . . . h . . . s . . . h . . .', 7) + ' | k . . . . . . . . . . . . . . .' }
      ]
    }
  };
  for (var name in TRACKS) {
    var tr = TRACKS[name], len = 0;
    for (var i = 0; i < tr.parts.length; i++) { tr.parts[i].ev = parse(tr.parts[i].score); len = Math.max(len, tr.parts[i].ev.length); }
    tr.len = len;
  }
  CM.BGM_TRACKS = TRACKS;

  CM.createBgm = function (sound, store) {
    var S = sound;
    var cur = null, step = 0, nextTime = null, bpm = 100, tempo = 1, timer = null, gen = 0;
    var enabled = !store || store.get('bgm', true) !== false;
    var LEVEL = 0.62;   // BGM のふつうの音量（効果音より少し控えめ）

    // 楽器の音色（tb-sound.js の synth）
    function play1(inst, f, at, dur) {
      var M = 'music';
      switch (inst) {
        case 'bass':      // まるいベース
          S.synth({ f: f, dur: dur * 0.9, vol: 0.12, at: at, bus: M, osc: [{ type: 'triangle' }, { type: 'sine', mul: 0.5, gain: 0.6 }],
            env: { a: 0.01, d: 0.3, s: 0.5, r: 0.12 }, filter: { f: 700, q: 0.7 } });
          break;
        case 'pbass':     // はじいたような、ぽこっとしたベース
          S.synth({ f: f, dur: 0.06, vol: 0.13, at: at, bus: M, osc: [{ type: 'triangle' }, { type: 'sine', mul: 0.5, gain: 0.5 }],
            env: { a: 0.003, d: 0.2, s: 0, r: 0.1 }, filter: { f: 1400, f1: 500, t: 0.12, q: 1.5 } });
          break;
        case 'marimba':   // 木琴：コロンと短く
          S.synth({ f: f, dur: 0.04, vol: 0.09, at: at, bus: M, osc: [{ type: 'sine' }, { type: 'sine', mul: 4, gain: 0.18 }, { type: 'triangle', gain: 0.3 }],
            env: { a: 0.002, d: 0.32, s: 0, r: 0.25 }, reverb: 0.3, pan: -0.15 });
          break;
        case 'glock':     // 鉄琴：キラッと
          S.synth({ f: f, dur: 0.04, vol: 0.035, at: at, bus: M, osc: [{ type: 'sine' }, { type: 'sine', mul: 2.76, gain: 0.25 }, { type: 'sine', mul: 5.4, gain: 0.08 }],
            env: { a: 0.002, d: 0.7, s: 0, r: 0.6 }, reverb: 0.45, echo: 0.15, pan: 0.25 });
          break;
        case 'pluck':     // せかすような、はじく音
          S.synth({ f: f, dur: 0.05, vol: 0.05, at: at, bus: M, osc: [{ type: 'triangle' }, { type: 'sawtooth', gain: 0.25 }],
            env: { a: 0.002, d: 0.18, s: 0, r: 0.12 }, filter: { f: 2400, f1: 900, t: 0.15, q: 1 }, reverb: 0.2, pan: 0.2 });
          break;
        case 'soft':      // やわらかい笛
          S.synth({ f: f, dur: dur * 0.9, vol: 0.045, at: at, bus: M, osc: [{ type: 'triangle' }, { type: 'sine', mul: 2, gain: 0.15 }],
            env: { a: 0.06, d: 0.3, s: 0.7, r: 0.3 }, vib: { rate: 5, depth: 10, delay: 0.3 }, reverb: 0.45, echo: 0.15 });
          break;
        default:          // pad：うしろで鳴りつづける和音
          S.synth({ f: f, dur: dur * 0.95, vol: 0.014, at: at, bus: M, osc: [{ type: 'sawtooth', detune: -8 }, { type: 'sawtooth', detune: 8 }],
            env: { a: 0.4, d: 0.6, s: 0.8, r: 0.6 }, filter: { f: 700, q: 0.5 }, reverb: 0.5 });
      }
    }
    function drum(d, at) {
      var M = 'music';
      if (d.indexOf('k') >= 0) S.synth({ f: 140, f1: 50, glide: 0.1, dur: 0.08, vol: 0.12, at: at, bus: M, osc: [{ type: 'sine' }], env: { a: 0.001, d: 0.16, s: 0, r: 0.08 } });
      if (d.indexOf('s') >= 0) S.noise({ type: 'bandpass', f0: 3800, dur: 0.03, vol: 0.05, q: 2, at: at, bus: M, reverb: 0.2 });
      if (d.indexOf('h') >= 0) S.noise({ type: 'highpass', f0: 7000, dur: 0.03, vol: 0.022, at: at, bus: M, pan: 0.3 });
      if (d.indexOf('t') >= 0) S.synth({ f: 2100, dur: 0.01, vol: 0.035, at: at, bus: M, osc: [{ type: 'sine' }], env: { a: 0.001, d: 0.04, s: 0, r: 0.03 }, pan: 0.35 });
      if (d.indexOf('o') >= 0) S.synth({ f: 1500, dur: 0.01, vol: 0.035, at: at, bus: M, osc: [{ type: 'sine' }], env: { a: 0.001, d: 0.05, s: 0, r: 0.03 }, pan: -0.35 });
    }
    function schedule(at) {
      var sd = 60 / (bpm * tempo) / 4;
      for (var i = 0; i < cur.parts.length; i++) {
        var p = cur.parts[i], e = p.ev[step % p.ev.length];
        if (!e) continue;
        if (e.drum) { drum(e.drum, at); continue; }
        for (var n = 0; n < e.notes.length; n++) if (e.notes[n]) play1(p.inst, e.notes[n], at, e.len * sd);
      }
    }
    function tick() {
      if (!cur || !enabled) return;
      var now = S.now();
      if (now === null) { nextTime = null; return; }   // まだ音が使えない・タブが裏にある
      if (nextTime === null || nextTime < now - 0.2) nextTime = now + 0.06;
      while (nextTime < now + 0.25) {
        schedule(nextTime);
        nextTime += 60 / (bpm * tempo) / 4;
        step = (step + 1) % cur.len;
      }
    }
    var want = null;   // 流したい曲（BGM を消していても覚えておく）
    var stopping = false;   // フェードアウトの途中
    var api = {
      /** 曲を流す（同じ曲がもう流れていたら、そのまま。restart で頭から） */
      play: function (name, restart) {
        var tr = TRACKS[name];
        if (!tr) return;
        want = name;
        if (cur === tr && !restart) {
          // 止めている途中に同じ曲が呼ばれたら、止めるのをやめて音量を戻す
          if (stopping) { gen++; stopping = false; if (enabled) S.musicVolume(LEVEL, 0.3); }
          return;
        }
        gen++; stopping = false;
        cur = tr; step = 0; nextTime = null; bpm = tr.bpm; tempo = 1;
        if (enabled) S.musicVolume(LEVEL, 0.05);
        if (!timer) timer = global.setInterval(tick, 30);
        tick();
      },
      /** フェードアウトして止める */
      stop: function (fade) {
        want = null;
        if (!cur) return;
        if (stopping) return;
        var my = ++gen;
        stopping = true;
        fade = fade || 0;
        S.musicVolume(0, fade);
        global.setTimeout(function () { if (my !== gen) return; cur = null; stopping = false; }, fade * 1000 + 60);
      },
      /** 速さ（1＝ふつう）。第3章で、8時が近づくと速くなる */
      setTempo: function (k) { tempo = k || 1; },
      get playing() { for (var k in TRACKS) if (TRACKS[k] === cur) return k; return null; },
      get enabled() { return enabled; },
      set enabled(on) {
        enabled = !!on;
        if (store) store.set('bgm', enabled);
        if (!enabled) { S.musicVolume(0, 0.3); nextTime = null; }
        else { S.musicVolume(LEVEL, 0.3); if (want) { var w = want; cur = null; api.play(w); } }
      }
    };
    return api;
  };
})(window);
