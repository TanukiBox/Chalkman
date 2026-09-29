/*
 * CHALK MAN エンディング回収画面・シェア
 *
 * ■ エンディング回収画面（タイトルから開く）
 *   8まいのカード。見たエンディングは自由帳のページ（名前つき）、まだのものは「？？？」。
 *   下のボタンで選ぶと、書く欄に文章（まだのときはヒント1行）が出る。
 *
 * ■ シェア（エンディング・ゲームオーバーの画面）
 *   文章：たどりついたエンディングの名前と「一番おかしかった瞬間」（最後に起きた珍回答。なければ最後に書いた単語）
 *   画像（1200×630）：黒板に、エンディングの名前と、えんぴつの棒人間
 *   スマホ：共有シート（画像つき）→ 使えないとき（PC など）：X の投稿画面
 *   公開した URL は config.js の SHARE_URL に書く（空なら、公開中のページの URL）
 */
(function (global) {
  'use strict';
  var CM = global.CM = global.CM || {};
  var U = CM.util, COL = CM.COL, TAU = U.TAU, PI = Math.PI;
  var SC = CM.SCENES;

  function T(k, p) { return CM.app.i18n.t(k, p); }
  function lang() { return CM.app.i18n.lang; }

  // ------------------------------------------------------------
  // エンディング回収画面
  // ------------------------------------------------------------
  SC.collection = {
    setup: function (sc, D) {
      sc.segs = [];
      sc.manX = D.st.x - 300; sc.restX = D.st.x;
      sc.sel = 0; sc.t = 0;
    },
    update: function (sc, dt, D) { sc.t += dt; D.man.alpha = 0; },
    /** カードの位置（2列×4段） */
    cards: function (D) {
      var st = D.st, s = D.s, top = st.y + 44, gap = 8, cw = (st.w - 28 - gap) / 2, ch = (st.h - 56 - gap * 3) / 4, list = [];
      for (var i = 0; i < 8; i++) list.push({ n: i + 1, x: st.x + 14 + (i % 2) * (cw + gap), y: top + Math.floor(i / 2) * (ch + gap), w: cw, h: ch });
      void s;
      return list;
    },
    drawChalk: function (ctx, sc, D) {
      var seen = CM.getSeenEndings(), cnt = Object.keys(seen).length;
      CM.chalk.text(ctx, T('collectionTitle', { n: cnt }), D.st.x + 14, D.st.y + 22, { size: 18, align: 'left', color: COL.yellow, maxW: D.st.w - 192 });
      SC.collection.cards(D).forEach(function (c) {
        if (seen[c.n] !== undefined) return;
        // まだ見ていない：チョークの点線のわくと「？？？」
        var pts = [c.x, c.y, c.x + c.w, c.y, c.x + c.w, c.y + c.h, c.x, c.y + c.h, c.x, c.y];
        for (var i = 0; i < 4; i++) {
          var x0 = pts[i * 2], y0 = pts[i * 2 + 1], x1 = pts[i * 2 + 2], y1 = pts[i * 2 + 3], len = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(len / 12);
          for (var k = 0; k < n; k += 2) CM.chalk.line(ctx, [U.lerp(x0, x1, k / n), U.lerp(y0, y1, k / n), U.lerp(x0, x1, (k + 1) / n), U.lerp(y0, y1, (k + 1) / n)], { w: 1.6, alpha: sc.sel === c.n ? 0.9 : 0.45, seed: c.n * 10 + i * 3 + k });
        }
        CM.chalk.text(ctx, c.n + '', c.x + 14, c.y + 16, { size: 14, alpha: 0.6 });
        CM.chalk.text(ctx, '？？？', c.x + c.w / 2, c.y + c.h / 2 + 4, { size: Math.min(22, c.h * 0.3), alpha: 0.7 });
      });
    },
    drawReal: function (ctx, sc, D) {
      var seen = CM.getSeenEndings();
      SC.collection.cards(D).forEach(function (c) {
        if (seen[c.n] === undefined) return;
        // 見たエンディング：自由帳のページに、名前
        var lift = sc.sel === c.n ? 3 : 0;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(c.x + 3, c.y + 4, c.w, c.h);
        ctx.fillStyle = c.n === 8 ? '#7d8189' : '#e8904a'; ctx.fillRect(c.x - 3, c.y - 3 - lift, c.w + 6, c.h + 6);
        ctx.fillStyle = '#fbfaf2'; ctx.fillRect(c.x, c.y - lift, c.w, c.h);
        ctx.strokeStyle = 'rgba(120,150,200,0.3)'; ctx.lineWidth = 1;
        for (var y = c.y + 14; y < c.y + c.h - 2; y += 11) { ctx.beginPath(); ctx.moveTo(c.x + 4, y - lift); ctx.lineTo(c.x + c.w - 4, y - lift); ctx.stroke(); }
        var E = CM.ENDINGS[c.n], title = CM.fillWord(E.title[lang()], seen[c.n] || '…');
        ctx.fillStyle = '#b8323f'; ctx.font = 'bold 13px ' + CM.FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(c.n + '', c.x + 8, c.y + 12 - lift);
        ctx.fillStyle = '#4a4a55'; ctx.font = Math.round(Math.min(15, c.h * 0.2)) + 'px ' + CM.FONT; ctx.textAlign = 'center';
        var tw = ctx.measureText(title).width, k = Math.min(1, (c.w - 12) / tw);
        ctx.save(); ctx.translate(c.x + c.w / 2, c.y + c.h * 0.58 - lift); ctx.scale(k, 1); ctx.fillText(title, 0, 0); ctx.restore();
        // 小さなはなまる
        ctx.strokeStyle = c.n === 8 ? '#7d8189' : '#d9414f'; ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (var a = 0; a < TAU * 2.2; a += 0.3) { var r = 2 + a * 1.1, px = c.x + c.w - 14 + Math.cos(a) * r, py = c.y + 14 - lift + Math.sin(a) * r; if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
        ctx.stroke();
        ctx.restore();
      });
    }
  };

  // ------------------------------------------------------------
  // シェア
  // ------------------------------------------------------------
  /** 珍回答の文章を、短くする（X の文字数に収まるように） */
  function short(str, n) { var a = U.chars(str); return a.length > n ? a.slice(0, n - 1).join('') + '…' : str; }

  /**
   * シェアする文章
   *   info = { ending: 番号, word: 最後の単語, lastFunny: { q, word, text } }
   */
  CM.shareText = function (info) {
    var E = CM.ENDINGS[info.ending], word = info.word || '', lines = [];
    var safeWord = word && !CM.isNG(word) ? word : '';
    if (info.ending === 8) lines.push(T('shareOver'));
    else lines.push(T('shareEnding', { n: info.ending, title: CM.fillWord(E.title[lang()], safeWord || '…') }));
    var f = info.lastFunny;
    if (f && f.word && !CM.isNG(f.word)) lines.push(T('shareFunny', { q: f.q, text: short(f.text, 60) }));
    else if (safeWord) lines.push(T('shareLast', { w: safeWord }));
    lines.push(T('shareTags'));
    return lines.join('\n');
  };

  /** 公開しているゲームの URL（分からなければ空） */
  CM.shareUrl = function () {
    if (CM.CFG.SHARE_URL) return CM.CFG.SHARE_URL;
    var loc = global.location;
    if (!loc || !/^https?:$/.test(loc.protocol)) return '';
    if (/claude|anthropic|localhost|127\.0\.0\.1/.test(loc.hostname)) return '';   // 試遊用のページは共有しない
    return loc.origin + loc.pathname;
  };

  /** シェア用の画像（1200×630）：黒板に、エンディングの名前と棒人間 */
  CM.makeShareCard = function (info) {
    var W = 1200, H = 630, s = 2.6;
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    var layer = document.createElement('canvas'); layer.width = W; layer.height = H;
    var lc = layer.getContext('2d');
    // 木のわくと黒板
    ctx.fillStyle = COL.wood; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = COL.woodDark; ctx.fillRect(0, H - 36, W, 36);
    var g = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 700);
    g.addColorStop(0, COL.boardLight); g.addColorStop(1, COL.board);
    ctx.fillStyle = g; ctx.fillRect(28, 28, W - 56, H - 84);
    // チョークで描く物
    var E = CM.ENDINGS[info.ending], word = info.word && !CM.isNG(info.word) ? info.word : '';
    var over = info.ending === 8;
    CM.chalk.text(lc, T('title'), 330, 120, { size: 84, color: COL.chalk });
    CM.chalk.text(lc, 'CHALK MAN', 330, 196, { size: 38, color: COL.yellow });
    CM.chalk.text(lc, over ? T('end8') : T('endingN', { n: info.ending }), 330, 300, { size: 44, color: over ? COL.red : COL.pink, maxW: 560 });
    if (!over) CM.chalk.text(lc, CM.fillWord(E.title[lang()], word || '…'), 330, 370, { size: 56, color: COL.chalk, maxW: 580 });
    var f = info.lastFunny;
    if (f && f.word && !CM.isNG(f.word)) CM.chalk.text(lc, T('shareCardFunny', { q: f.q, w: f.word }), 330, 470, { size: 34, color: COL.yellow, maxW: 580 });
    else if (word) CM.chalk.text(lc, T('shareCardLast', { w: word }), 330, 470, { size: 34, color: COL.yellow, maxW: 580 });
    // 棒人間（よろこぶ・消えかけ）
    var anim = over ? 'puzzled' : 'cheer', A = CM.MAN_ANIMS[anim];
    var env = { stage: { x: 700, y: 0, w: 460, h: H }, groundY: 500, cx: 900, s: s, fixedX: 900, f: -1 };
    var fr = A.frame(over ? 1 : 0.6, env, {}, 0);
    CM.drawMan(lc, fr.pose, s, 0, { alpha: over ? 0.45 : 1 });
    CM.chalk.line(lc, [720, 500, 1140, 500], { w: 5, seed: 3 });
    if (!over) for (var i = 0; i < 6; i++) { var a = -PI / 2 + (i - 2.5) * 0.4; CM.chalk.line(lc, [900 + Math.cos(a) * 250, 270 + Math.sin(a) * 200, 900 + Math.cos(a) * 290, 270 + Math.sin(a) * 235], { w: 5, color: COL.yellow, seed: 10 + i }); }
    CM.chalk.applyGrain(lc, 0.8);
    ctx.drawImage(layer, 0, 0);
    // 黒板消し（ゲームオーバー）と、作者
    if (over) CM.props.realEraser(ctx, { x: 1010, y: 330, rot: 0.2, s: 3 });
    ctx.fillStyle = '#f4e3c8'; ctx.font = '24px ' + CM.FONT; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText('Tanuki Box', W - 40, H - 18);
    return c;
  };

  function canvasToFile(c) {
    var url = c.toDataURL('image/png');
    var bin = global.atob(url.split(',')[1]), arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new File([arr], 'chalkman.png', { type: 'image/png' });
  }
  CM.shareIntentUrl = function (text, url) {
    var q = 'text=' + encodeURIComponent(text);
    if (url) q += '&url=' + encodeURIComponent(url);
    return 'https://x.com/intent/post?' + q;
  };
  function openIntent(text, url) {
    var href = CM.shareIntentUrl(text, url), w = null;
    try { w = global.open(href, '_blank'); if (w) w.opener = null; } catch (e) { w = null; }
    if (!w) {
      var a = document.createElement('a');
      a.href = href; a.target = '_blank'; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
    }
  }
  /** シェアする。まず画像つきの共有シート（スマホ）、だめなら X の投稿画面 */
  CM.share = function (info) {
    var text = CM.shareText(info), url = CM.shareUrl(), nav = global.navigator;
    try {
      var touch = global.matchMedia && global.matchMedia('(pointer: coarse)').matches;
      if (touch && nav && nav.share && nav.canShare) {
        var data = { files: [canvasToFile(CM.makeShareCard(info))], text: url ? text + '\n' + url : text };
        if (nav.canShare(data)) {
          nav.share(data).catch(function (e) { if (e && e.name === 'AbortError') return; openIntent(text, url); });
          return 'sheet';
        }
      }
    } catch (e) { /* 使えないときは下へ */ }
    openIntent(text, url);
    return 'intent';
  };
})(window);
