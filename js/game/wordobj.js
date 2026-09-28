/*
 * CHALK MAN 文字オブジェクト
 * プレイヤーが書いた単語を、そのままの文字で「物」にする（別の言葉や絵に置き換えない）。
 * ・1文字ずつ別々の絵（スプライト）にしておくので、文字ごとに跳ねたり波打ったりできる。
 * ・色つき（熱い＝赤、冷たい＝青白 など）は、白い文字を色で塗り直した絵を作っておいて使う。
 * ・書く演出：CM.createWriter が、1文字ずつチョークで書いていく（カツカツという音つき）。
 */
(function (global) {
  'use strict';
  var CM = global.CM = global.CM || {};
  var U = CM.util, COL = CM.COL, CFG = CM.CFG, TAU = U.TAU;

  var BASE = 64; // 文字の絵を作るときの大きさ（px）。表示の大きさは scale で決める

  function makeCharCanvas(ch, dpr) {
    var m = document.createElement('canvas').getContext('2d');
    m.font = BASE + 'px ' + CM.FONT;
    var w = Math.max(BASE * 0.3, m.measureText(ch).width);
    var pad = BASE * 0.12, cw = w + pad * 2, chh = BASE * 1.4;
    var c = document.createElement('canvas');
    c.width = Math.ceil(cw * dpr); c.height = Math.ceil(chh * dpr);
    var g = c.getContext('2d');
    g.scale(dpr, dpr);
    g.font = BASE + 'px ' + CM.FONT;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = COL.chalk; g.strokeStyle = COL.chalk;
    var x = cw / 2, y = chh / 2 + BASE * 0.04;
    if (ch.trim()) {
      g.fillText(ch, x, y);
      g.globalAlpha = 0.6; g.fillText(ch, x + BASE * 0.012, y + BASE * 0.008);
      g.globalAlpha = 0.5; g.lineWidth = BASE * 0.03; g.lineJoin = 'round'; g.strokeText(ch, x, y);
    }
    return { cv: c, w: w, cw: cw, ch: chh, tints: {} };
  }

  function tinted(sp, color) {
    if (!color) return sp.cv;
    if (sp.tints[color]) return sp.tints[color];
    var c = document.createElement('canvas');
    c.width = sp.cv.width; c.height = sp.cv.height;
    var g = c.getContext('2d');
    g.drawImage(sp.cv, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    sp.tints[color] = c;
    return c;
  }

  /**
   * 文字オブジェクトを作る
   *   var w = CM.createWord('オノ', dpr);
   *   w.x = 100; w.y = 200; w.setSize(40);  // 表示する文字の大きさ(px)
   *   w.draw(ctx);
   */
  CM.createWord = function (text, dpr) {
    var list = U.chars(text);
    var chars = [], x = 0;
    for (var i = 0; i < list.length; i++) {
      var sp = makeCharCanvas(list[i], dpr);
      sp.text = list[i];
      sp.x = x;
      x += sp.w * 0.96;
      chars.push(sp);
    }
    var width = Math.max(1, x);
    var obj = {
      text: text, chars: chars, width: width, height: BASE,
      x: 0, y: 0, scale: 0.5, sx: 1, sy: 1, rot: 0, alpha: 1,
      tint: null, bold: false, shine: -1,
      off: chars.map(function () { return { x: 0, y: 0, r: 0, s: 1, a: 1 }; }),
      reveal: chars.map(function () { return 1; }),
      bites: [],
      /** 表示する文字の高さを px で決める */
      setSize: function (px) { obj.scale = px / BASE; },
      get size() { return obj.scale * BASE; },
      /** 今の見た目の幅と高さ（伸び縮み込み） */
      dispW: function () { return width * obj.scale * Math.abs(obj.sx); },
      dispH: function () { return BASE * obj.scale * Math.abs(obj.sy); },
      /** 動きの前に毎回、元の形に戻す */
      resetPose: function () {
        obj.sx = 1; obj.sy = 1; obj.rot = 0; obj.alpha = 1; obj.tint = null; obj.bold = false; obj.shine = -1;
        for (var k = 0; k < obj.off.length; k++) { var o = obj.off[k]; o.x = 0; o.y = 0; o.r = 0; o.s = 1; o.a = 1; }
      },
      /** i 文字目の、今の画面上の位置（書いている途中のチョークの先など） */
      charPos: function (k, fx, fy) {
        var sp = chars[k];
        var lx = (-width / 2 + sp.x + sp.w / 2 + (fx || 0) * sp.w / 2) * obj.scale * obj.sx;
        var ly = (fy || 0) * BASE * 0.5 * obj.scale * obj.sy;
        var c = Math.cos(obj.rot), s = Math.sin(obj.rot);
        return [obj.x + lx * c - ly * s, obj.y + lx * s + ly * c];
      },
      draw: function (ctx, o) {
        o = o || {};
        if (obj.alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = obj.alpha * (o.alpha === undefined ? 1 : o.alpha);
        ctx.translate(obj.x, obj.y);
        ctx.rotate(obj.rot);
        ctx.scale(obj.scale * obj.sx, obj.scale * obj.sy);
        var left = -width / 2;
        var tint = o.tint || obj.tint;
        for (var k = 0; k < chars.length; k++) {
          var sp = chars[k], rv = obj.reveal[k], of = obj.off[k];
          if (rv <= 0 || !sp.text.trim()) continue;
          ctx.save();
          ctx.translate(left + sp.x + sp.w / 2 + of.x, of.y);
          if (of.r) ctx.rotate(of.r);
          if (of.s !== 1) ctx.scale(of.s, of.s);
          if (of.a !== 1) ctx.globalAlpha *= of.a;
          if (rv < 1) {
            // 書いている途中：左上から右下へ、斜めに見えていく
            ctx.beginPath();
            var L = -sp.cw / 2, Tp = -sp.ch / 2, span = sp.cw + sp.ch;
            var e = span * rv;
            ctx.moveTo(L, Tp); ctx.lineTo(L + e, Tp); ctx.lineTo(L + e - sp.ch, Tp + sp.ch); ctx.lineTo(L, Tp + sp.ch);
            ctx.closePath();
            ctx.clip();
          }
          var img = tinted(sp, tint);
          ctx.drawImage(img, -sp.cw / 2, -sp.ch / 2, sp.cw, sp.ch);
          if (obj.bold) ctx.drawImage(img, -sp.cw / 2 + 1.5, -sp.ch / 2 + 1, sp.cw, sp.ch);
          ctx.restore();
        }
        // かじった跡（食べられる）
        if (obj.bites.length) {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.fillStyle = '#000';
          obj.bites.forEach(function (b) {
            ctx.beginPath();
            for (var q = 0; q < 3; q++) ctx.arc(b.x + (q - 1) * b.r * 0.55, b.y + Math.abs(q - 1) * b.r * 0.2, b.r * 0.55, 0, TAU);
            ctx.fill();
          });
          ctx.globalCompositeOperation = 'source-over';
        }
        // ピカッと光る帯（硬い）
        if (obj.shine >= 0 && obj.shine <= 1) {
          ctx.globalCompositeOperation = 'source-atop';
          var sx = U.lerp(-width / 2 - BASE, width / 2 + BASE, obj.shine);
          var g = ctx.createLinearGradient(sx - BASE * 0.5, 0, sx + BASE * 0.5, 0);
          g.addColorStop(0, 'rgba(255,255,255,0)');
          g.addColorStop(0.5, 'rgba(255,255,255,1)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.fillRect(-width / 2 - BASE, -BASE, width + BASE * 2, BASE * 2);
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.restore();
      }
    };
    return obj;
  };

  /**
   * 1文字ずつチョークで書く演出
   *   var wr = CM.createWriter(word, { onTap: fn, fx: fx });
   *   wr.update(dt); wr.drawTip(ctx);  wr.done が true になったら書き終わり
   */
  CM.createWriter = function (word, opts) {
    opts = opts || {};
    var n = word.chars.length;
    var CH = CFG.WRITE_CHAR_SEC, GAP = CFG.WRITE_GAP_SEC, TAPS = CFG.WRITE_TAPS;
    // 長い単語は少し速く書く
    if (n > 6) { CH *= 6 / n + 0.35; GAP *= 0.6; }
    var t = 0, tapsDone = 0, total = n * (CH + GAP);
    for (var i = 0; i < n; i++) word.reveal[i] = 0;
    var tip = [word.x, word.y];
    var wr = {
      done: false,
      progress: 0,
      update: function (dt) {
        if (wr.done) return;
        t += dt;
        var cur = -1;
        for (var k = 0; k < n; k++) {
          var t0 = k * (CH + GAP);
          word.reveal[k] = U.range(t, t0, t0 + CH);
          if (t >= t0 && t < t0 + CH) cur = k;
          // カツカツ（1文字に TAPS 回）
          for (var q = 0; q < TAPS; q++) {
            var id = k * TAPS + q, at = t0 + (CH * q) / TAPS;
            if (id >= tapsDone && t >= at) {
              tapsDone = id + 1;
              if (word.chars[k].text.trim()) {
                opts.onTap && opts.onTap(q);
                if (opts.fx) {
                  var p = word.charPos(k, (q / TAPS) * 1.4 - 0.7, 0.3);
                  opts.fx.dust(p[0], p[1], 3, { speed: 40, g: 220, life: 0.6, size: 1.4 });
                }
              }
            }
          }
        }
        if (cur >= 0) {
          var rv = word.reveal[cur];
          // チョークの先：文字の中を上下にジグザグしながら右へ
          var zig = Math.sin(rv * Math.PI * 5) * 0.7;
          tip = word.charPos(cur, rv * 1.8 - 0.9, zig);
        }
        wr.progress = U.clamp(t / total, 0, 1);
        if (t >= total) { wr.done = true; for (k = 0; k < n; k++) word.reveal[k] = 1; }
      },
      /** 書いているチョーク（本物のチョーク。かすれさせない） */
      drawTip: function (ctx) {
        if (wr.done) return;
        var s = Math.max(0.6, word.size / 48);
        ctx.save();
        ctx.translate(tip[0], tip[1]);
        ctx.rotate(-0.9);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(2, -3 * s + 3, 34 * s, 7 * s);
        ctx.fillStyle = '#fbfaf4';
        ctx.fillRect(0, -3.5 * s, 34 * s, 7 * s);
        ctx.fillStyle = '#dcdad0';
        ctx.fillRect(0, 1.2 * s, 34 * s, 2.3 * s);
        ctx.restore();
      }
    };
    return wr;
  };
})(window);
