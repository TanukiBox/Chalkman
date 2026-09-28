/*
 * CHALK MAN 小さな道具（計算まわり）
 */
(function (global) {
  'use strict';
  var CM = global.CM = global.CM || {};
  var TAU = Math.PI * 2;

  var segmenter = null;
  try {
    if (global.Intl && Intl.Segmenter) segmenter = new Intl.Segmenter('ja', { granularity: 'grapheme' });
  } catch (e) { segmenter = null; }

  CM.util = {
    TAU: TAU,
    clamp: function (v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    /** 0〜1 の範囲に切り出す（t が a→b で 0→1） */
    range: function (t, a, b) { return CM.util.clamp((t - a) / (b - a), 0, 1); },
    easeOut: function (t) { return 1 - (1 - t) * (1 - t); },
    easeIn: function (t) { return t * t; },
    easeInOut: function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
    /** ぴょんと行き過ぎてから戻る */
    easeBack: function (t) { var c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    /** 決まった数から、いつも同じ 0〜1 の数を作る（毎回同じ「ゆらぎ」にするため） */
    hash: function (n) {
      var s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
      return s - Math.floor(s);
    },
    /** 種(seed)を決めると、毎回同じ並びになる乱数 */
    rng: function (seed) {
      var s = (seed >>> 0) || 1;
      return function () {
        s ^= s << 13; s >>>= 0;
        s ^= s >>> 17;
        s ^= s << 5; s >>>= 0;
        return s / 4294967296;
      };
    },
    rand: function (a, b) { return a + Math.random() * (b - a); },
    pick: function (list) { return list[Math.floor(Math.random() * list.length)]; },
    /** 文字列を「見た目の1文字」ずつに分ける（絵文字や濁点つきでも崩れない） */
    chars: function (str) {
      str = String(str || '');
      if (segmenter) {
        var out = [];
        var it = segmenter.segment(str)[Symbol.iterator]();
        for (var r = it.next(); !r.done; r = it.next()) out.push(r.value.segment);
        return out;
      }
      return Array.from(str);
    },
    now: function () { return (global.performance ? global.performance.now() : Date.now()) / 1000; }
  };
})(window);
