/*
 * CHALK MAN 効果音のレシピ
 * 出来事の名前（'tap' など）で鳴らす。音はすべてその場で作る（共通土台 tb-sound.js）。
 */
(function (global) {
  'use strict';
  var CM = global.CM = global.CM || {};

  var BELL = [{ type: 'sine' }, { type: 'sine', mul: 2, gain: 0.35 }, { type: 'triangle', mul: 3, gain: 0.12 }];
  var SOFT = [{ type: 'triangle' }, { type: 'sine', mul: 2, gain: 0.3 }];
  var METAL = [{ type: 'sine' }, { type: 'sine', mul: 2.76, gain: 0.5 }, { type: 'sine', mul: 5.4, gain: 0.3 }, { type: 'sine', mul: 8.9, gain: 0.15 }];
  var SCALE = [0, 4, 7, 12, 7, 4, 2, 5, 9, 12, 9, 5];
  function note(base, semi) { return base * Math.pow(2, semi / 12); }

  CM.createSfx = function (sound) {
    var S = sound;
    function bell(f, o) {
      o = o || {};
      S.synth({ f: f, dur: o.dur || 0.05, vol: o.vol || 0.06, osc: BELL, env: { a: 0.002, d: o.d || 0.25, s: 0, r: o.r || 0.25 },
        delay: o.delay, reverb: o.reverb === undefined ? 0.3 : o.reverb, pan: o.pan || 0 });
    }

    var recipes = {
      // チョークで書く「カツ」：かたい粒の音 + 短いこすれ
      tap: function (q) {
        var f = 2400 + Math.random() * 900 + (q ? 300 : 0);
        S.noise({ dur: 0.028, vol: 0.34, f0: f, f1: f * 0.7, q: 3, reverb: 0.08 });
        S.tone({ type: 'triangle', f0: 1400 + Math.random() * 300, f1: 700, dur: 0.02, vol: 0.12 });
        S.noise({ dur: 0.06, vol: 0.06, f0: 5200, f1: 3800, q: 1.2, type: 'bandpass', delay: 0.012 });
      },
      // 文字が黒板からはがれて浮く
      lift: function () {
        S.noise({ dur: 0.25, vol: 0.08, f0: 900, f1: 3000, q: 0.8, reverb: 0.2 });
        S.synth({ f: 440, f1: 880, glide: 0.25, dur: 0.2, vol: 0.05, osc: SOFT, env: { a: 0.02, d: 0.2, s: 0.4, r: 0.15 }, reverb: 0.3 });
      },
      // 文字がステージに着く
      land: function () {
        S.tone({ type: 'sine', f0: 180, f1: 90, dur: 0.12, vol: 0.2 });
        S.noise({ dur: 0.1, vol: 0.12, f0: 600, f1: 250, q: 0.8 });
      },
      ui: function () { S.tone({ type: 'triangle', f0: 900, f1: 1200, dur: 0.05, vol: 0.06 }); },

      // ---- 棒人間 ----
      step: function () { S.noise({ dur: 0.04, vol: 0.05, f0: 700, f1: 400, q: 1.5 }); },
      stepFast: function () { S.noise({ dur: 0.035, vol: 0.06, f0: 900, f1: 500, q: 1.5 }); },
      climb: function () { S.tone({ type: 'triangle', f0: 520, f1: 480, dur: 0.04, vol: 0.05 }); },
      stroke: function () { S.noise({ dur: 0.18, vol: 0.06, f0: 1200, f1: 500, q: 0.7, reverb: 0.2 }); },
      jump: function () {
        S.synth({ f: 330, f1: 700, glide: 0.12, dur: 0.1, vol: 0.08, osc: SOFT, env: { a: 0.004, d: 0.1, s: 0.3, r: 0.08 }, reverb: 0.1 });
      },
      fall: function () {
        S.synth({ f: 1400, f1: 300, glide: 0.9, dur: 0.9, vol: 0.05, osc: [{ type: 'sine' }], env: { a: 0.02, d: 0.3, s: 0.8, r: 0.1 }, vib: { rate: 7, depth: 20 }, reverb: 0.2 });
      },
      whoosh: function () { S.noise({ dur: 0.18, vol: 0.18, f0: 600, f1: 2600, q: 0.9 }); },
      cheer: function () {
        [0, 4, 7, 12].forEach(function (s, i) { bell(note(784, s), { delay: i * 0.07, vol: 0.05 }); });
      },
      puzzled: function () {
        S.synth({ f: 330, f1: 440, glide: 0.25, dur: 0.22, vol: 0.06, osc: SOFT, env: { a: 0.02, d: 0.2, s: 0.6, r: 0.12 }, reverb: 0.2 });
      },
      gasp: function () { S.synth({ f: 700, f1: 1000, glide: 0.08, dur: 0.1, vol: 0.05, osc: SOFT, env: { a: 0.005, d: 0.1, s: 0.3, r: 0.06 } }); },
      // 黒板消しのゴシゴシ
      wipe: function () {
        S.noise({ dur: 0.28, vol: 0.2, f0: 1800, f1: 900, q: 0.6, attack: 0.03 });
        S.noise({ dur: 0.2, vol: 0.14, f0: 1200, f1: 2000, q: 0.6, delay: 0.16, attack: 0.03 });
      },

      // ---- 文字の動き（タグ）----
      fly: function () { S.synth({ f: 500, f1: 1000, glide: 0.5, dur: 0.45, vol: 0.05, osc: SOFT, env: { a: 0.05, d: 0.3, s: 0.5, r: 0.3 }, vib: { rate: 6, depth: 15 }, reverb: 0.35 }); },
      splash: function () { S.noise({ dur: 0.35, vol: 0.18, f0: 2500, f1: 600, q: 0.6, reverb: 0.2 }); },
      fire: function () { S.noise({ dur: 0.5, vol: 0.12, f0: 400, f1: 1600, q: 0.5, attack: 0.05 }); },
      crackle: function () {
        for (var i = 0; i < 3; i++) S.noise({ dur: 0.015, vol: 0.08, f0: 3000 + Math.random() * 2000, q: 4, delay: Math.random() * 0.2 });
      },
      freeze: function () { [0, 7, 12, 19].forEach(function (s, i) { bell(note(1320, s), { delay: i * 0.05, vol: 0.035, d: 0.4 }); }); },
      thud: function () {
        S.synth({ f: 110, f1: 40, glide: 0.25, dur: 0.25, vol: 0.35, osc: [{ type: 'sine' }, { type: 'triangle', gain: 0.4 }], env: { a: 0.002, d: 0.2, s: 0.2, r: 0.15 } });
        S.noise({ dur: 0.3, vol: 0.25, f0: 500, f1: 120, q: 0.7, type: 'lowpass' });
      },
      grow: function () {
        S.synth({ f: 90, f1: 55, glide: 0.6, dur: 0.6, vol: 0.2, osc: [{ type: 'sawtooth', detune: -10 }, { type: 'sawtooth', detune: 10 }], env: { a: 0.05, d: 0.4, s: 0.5, r: 0.3 }, filter: { f: 600, f1: 200, q: 1 }, reverb: 0.3 });
      },
      pop: function () { S.tone({ type: 'sine', f0: 500, f1: 1600, dur: 0.08, vol: 0.14 }); },
      tiny: function () { S.tone({ type: 'sine', f0: 1500, f1: 2000, dur: 0.04, vol: 0.04 }); },
      stretch: function () {
        S.synth({ f: 200, f1: 600, glide: 0.5, dur: 0.5, vol: 0.06, osc: [{ type: 'triangle' }], env: { a: 0.02, d: 0.3, s: 0.6, r: 0.2 }, vib: { rate: 12, depth: 40, delay: 0 }, reverb: 0.15 });
      },
      clang: function () {
        S.synth({ f: 880, dur: 0.05, vol: 0.12, osc: METAL, env: { a: 0.001, d: 0.5, s: 0, r: 0.6 }, reverb: 0.35 });
        S.noise({ dur: 0.05, vol: 0.15, f0: 5000, q: 2 });
      },
      clink: function () { S.synth({ f: 1320, dur: 0.03, vol: 0.05, osc: METAL, env: { a: 0.001, d: 0.2, s: 0, r: 0.25 }, reverb: 0.3 }); },
      boing: function () {
        S.synth({ f: 160, f1: 420, glide: 0.35, dur: 0.4, vol: 0.12, osc: SOFT, env: { a: 0.01, d: 0.3, s: 0.4, r: 0.2 }, vib: { rate: 14, depth: 60, delay: 0 } });
      },
      glow: function () {
        [0, 4, 7, 11, 14].forEach(function (s, i) { bell(note(880, s), { delay: i * 0.06, vol: 0.03, d: 0.6, r: 0.6 }); });
      },
      note: function (k) { bell(note(523, SCALE[(k || 0) % SCALE.length]), { vol: 0.07, d: 0.3 }); },
      munch: function () {
        S.noise({ dur: 0.06, vol: 0.2, f0: 1500, f1: 700, q: 1.5 });
        S.noise({ dur: 0.06, vol: 0.16, f0: 1300, f1: 600, q: 1.5, delay: 0.1 });
      },
      sparkle: function () { [12, 16, 19, 24].forEach(function (s, i) { bell(note(660, s), { delay: i * 0.04, vol: 0.03 }); }); },
      warn: function () {
        S.tone({ type: 'square', f0: 880, dur: 0.1, vol: 0.035, filter: { type: 'lowpass', f: 2200 } });
        S.tone({ type: 'square', f0: 660, dur: 0.1, vol: 0.035, delay: 0.14, filter: { type: 'lowpass', f: 2200 } });
      },
      cute: function () { [0, 7, 12].forEach(function (s, i) { bell(note(1046, s), { delay: i * 0.08, vol: 0.035 }); }); },

      // 辞書にない言葉：文字がぽろぽろ崩れる
      crumble: function () {
        for (var i = 0; i < 6; i++) S.noise({ dur: 0.05, vol: 0.1, f0: 1800 + Math.random() * 1500, q: 2, delay: i * 0.09 + Math.random() * 0.04 });
        S.synth({ f: 440, f1: 330, glide: 0.3, dur: 0.3, vol: 0.04, osc: SOFT, env: { a: 0.02, d: 0.2, s: 0.5, r: 0.2 } });
      },

      // ---- 本編の演出 ----
      pickup: function () { S.tone({ type: 'triangle', f0: 500, f1: 800, dur: 0.06, vol: 0.06 }); },
      patter: function () { S.noise({ dur: 0.02, vol: 0.05, f0: 2500 + Math.random() * 1500, q: 3 }); },
      gulp: function () { S.synth({ f: 220, f1: 160, glide: 0.12, dur: 0.12, vol: 0.12, osc: SOFT, env: { a: 0.01, d: 0.1, s: 0.3, r: 0.08 } }); },
      stir: function () { for (var i = 0; i < 4; i++) S.noise({ dur: 0.2, vol: 0.06, f0: 800, f1: 1400, q: 1, delay: i * 0.3 }); },
      poof: function () { S.noise({ dur: 0.4, vol: 0.2, f0: 600, f1: 150, q: 0.7 }); },
      boom: function () {
        S.synth({ f: 90, f1: 35, glide: 0.4, dur: 0.4, vol: 0.4, osc: [{ type: 'sine' }, { type: 'triangle', gain: 0.5 }], env: { a: 0.002, d: 0.3, s: 0.2, r: 0.3 }, reverb: 0.4 });
        S.noise({ dur: 0.5, vol: 0.3, f0: 800, f1: 100, q: 0.6 });
      },
      bark: function () {
        S.synth({ f: 520, f1: 300, glide: 0.08, dur: 0.08, vol: 0.09, osc: [{ type: 'sawtooth' }], env: { a: 0.005, d: 0.06, s: 0.4, r: 0.05 }, filter: { f: 1800, q: 2 } });
        S.synth({ f: 480, f1: 280, glide: 0.08, dur: 0.07, vol: 0.08, osc: [{ type: 'sawtooth' }], env: { a: 0.005, d: 0.06, s: 0.4, r: 0.05 }, filter: { f: 1800, q: 2 }, delay: 0.16 });
      },
      growl: function () { S.synth({ f: 90, f1: 70, glide: 0.6, dur: 0.6, vol: 0.12, osc: [{ type: 'sawtooth' }], env: { a: 0.05, d: 0.3, s: 0.6, r: 0.2 }, filter: { f: 300, q: 4 }, vib: { rate: 18, depth: 60, delay: 0 } }); },
      dig: function () { S.noise({ dur: 0.12, vol: 0.2, f0: 900, f1: 300, q: 1 }); },
      swirl: function () { S.synth({ f: 600, f1: 150, glide: 1.2, dur: 1.2, vol: 0.05, osc: SOFT, env: { a: 0.05, d: 0.5, s: 0.6, r: 0.3 }, vib: { rate: 8, depth: 80, delay: 0 }, reverb: 0.3 }); },
      yawn: function () { S.synth({ f: 300, f1: 200, glide: 0.8, dur: 0.8, vol: 0.06, osc: SOFT, env: { a: 0.1, d: 0.4, s: 0.6, r: 0.3 } }); },
      flop: function () { S.noise({ dur: 0.05, vol: 0.12, f0: 1500, f1: 800, q: 2 }); },
      rattle: function () { for (var i = 0; i < 8; i++) S.noise({ dur: 0.03, vol: 0.08, f0: 2000 + Math.random() * 2000, q: 3, delay: i * 0.1 }); },

      // ---- チョーク残量 ----
      snap: function () {
        S.noise({ dur: 0.04, vol: 0.35, f0: 3200, q: 2.5 });
        S.tone({ type: 'triangle', f0: 1800, f1: 900, dur: 0.05, vol: 0.1 });
        S.noise({ dur: 0.03, vol: 0.12, f0: 4200, q: 3, delay: 0.18 });
        S.noise({ dur: 0.03, vol: 0.08, f0: 3800, q: 3, delay: 0.26 });
      },
      // エンディングのファンファーレ（チョークが多い・隠し）と、やさしい曲（チョークが少ない）
      fanfare: function () {
        [[0, 0], [4, 0.14], [7, 0.28], [12, 0.42], [7, 0.62], [12, 0.76], [16, 0.9], [19, 1.1], [24, 1.3]].forEach(function (n) {
          bell(note(523, n[0]), { delay: n[1], vol: 0.07, d: 0.5, r: 0.5 });
          bell(note(262, n[0]), { delay: n[1], vol: 0.04, d: 0.4 });
        });
      },
      softTune: function () {
        [[12, 0], [7, 0.4], [9, 0.8], [4, 1.2], [5, 1.7], [4, 2.1], [2, 2.5], [0, 3.0]].forEach(function (n) {
          bell(note(523, n[0]), { delay: n[1], vol: 0.05, d: 0.7, r: 0.7 });
        });
      },
      heal: function () { [0, 4, 7, 12].forEach(function (s, i) { bell(note(660, s), { delay: i * 0.06, vol: 0.05 }); }); },
      gameover: function () {
        [7, 3, 0, -5].forEach(function (s, i) {
          S.synth({ f: note(330, s), dur: 0.3, vol: 0.06, osc: SOFT, delay: i * 0.28, env: { a: 0.02, d: 0.3, s: 0.5, r: 0.3 }, reverb: 0.4 });
        });
      }
    };

    // スマホは画面をさわるまで音を出せないので、それまでは鳴らさない（警告も出さない）
    var unlocked = false;
    ['pointerdown', 'keydown', 'touchend'].forEach(function (ev) {
      global.addEventListener(ev, function () { unlocked = true; }, { passive: true, capture: true });
    });

    return {
      play: function (name, arg) {
        if (!unlocked) return;
        var r = recipes[name];
        if (r) { try { r(arg); } catch (e) { /* 音が出なくてもゲームは止めない */ } }
      },
      has: function (name) { return !!recipes[name]; }
    };
  };
})(window);
