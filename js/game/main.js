/*
 * CHALK MAN 起動・画面サイズ合わせ・毎フレームの進行
 *
 * 描く順番：
 *   1. 黒板（木の枠・消し跡。画面の大きさが変わったときだけ作り直す）
 *   2. チョークのレイヤー（棒人間・文字・粉など）→ 黒板のざらざらで削ってから重ねる
 *   3. かすれない物（光・暗がり・黒板消し・書いているチョーク・チョーク残量）
 *
 * スマホでキーボードが開いたときは「見えている高さ」(visualViewport) に合わせて並べ直し、
 * 棒人間の場所がキーボードに隠れないようにする。
 */
(function (global) {
  'use strict';
  var CM = global.CM = global.CM || {};
  var CFG = CM.CFG;

  var appEl = document.getElementById('app');
  var canvas = document.getElementById('board');
  var ctx = canvas.getContext('2d');
  var padEl = document.getElementById('pad'), hudEl = document.getElementById('hud');
  var safeEl = document.getElementById('safe');
  var bg = document.createElement('canvas'), bctx = bg.getContext('2d');
  var layer = document.createElement('canvas'), lctx = layer.getContext('2d');
  var vv = global.visualViewport || null;

  var app = CM.app = {
    W: 0, H: 0, dpr: 1, L: null,
    store: TB.createStore('chalkman'),
    i18n: TB.createI18n(CM.TEXT, 'en'),
    fx: CM.createFx(),       // チョークで描く飛びもの
    realFx: CM.createFx(),   // 本物の物（折れたチョークのかけら など）
    chalk: CM.createChalkMeter(),
    fontVersion: 0,
    inputFocused: false,
    /** #app の画面上の位置（DOM の位置をキャンバスの座標に直すのに使う） */
    appRect: function () { return appEl.getBoundingClientRect(); },
    onInputFocus: function (on) {
      app.inputFocused = on;
      if (!on) { try { global.scrollTo(0, 0); } catch (e) { /* noop */ } }
      checkSize(true);
    },
    /** ボタンや入力欄を、黒板の配置に合わせて置き直す */
    relayoutDom: function () {
      var L = app.L;
      if (!L) return;
      var p = L.pad, st = L.stage;
      padEl.style.left = (p.x + 10) + 'px';
      padEl.style.top = (p.y + (L.portrait ? 10 : 12)) + 'px';
      padEl.style.width = (p.w - 20) + 'px';
      padEl.style.height = (p.h - (L.portrait ? 16 : 22)) + 'px';
      padEl.classList.toggle('kb', !!L.keyboard);
      padEl.classList.toggle('compact', p.h < 480);
      hudEl.style.left = 'auto';
      hudEl.style.right = (L.W - (st.x + st.w) + 8) + 'px';
      hudEl.style.top = (st.y + 8) + 'px';
    }
  };
  document.documentElement.lang = app.i18n.lang;
  app.sound = TB.createSound(app.store);
  app.sfx = CM.createSfx(app.sound);
  app.bgm = CM.createBgm(app.sound, app.store);   // BGM（場面ごとに曲が変わる）

  // ------------------------------------------------------------
  // 画面の大きさ
  // ------------------------------------------------------------
  var maxHByWidth = {}, lastPortrait = null, lastKey = '';

  function readSafe() {
    var cs = global.getComputedStyle(safeEl);
    return {
      top: parseFloat(cs.paddingTop) || 0, right: parseFloat(cs.paddingRight) || 0,
      bottom: parseFloat(cs.paddingBottom) || 0, left: parseFloat(cs.paddingLeft) || 0
    };
  }

  function checkSize(force) {
    var w = vv ? vv.width : global.innerWidth;
    var h = vv ? vv.height : global.innerHeight;
    var top = vv ? vv.offsetTop : 0;
    w = Math.round(w); h = Math.round(h);
    // この横幅で一番高かった高さ（キーボードが開いていないときの高さ）
    var wk = String(w);
    var full = Math.max(maxHByWidth[wk] || 0, global.innerHeight, h);
    maxHByWidth[wk] = full;
    var keyboard = app.inputFocused && full - h > 110;
    var portrait = keyboard && lastPortrait !== null ? lastPortrait : h >= w * 0.95;
    if (!keyboard) lastPortrait = portrait;
    var dpr = Math.min(global.devicePixelRatio || 1, CFG.MAX_DPR);
    var key = [w, h, top, keyboard, portrait, dpr].join(',');
    if (!force && key === lastKey) return;
    lastKey = key;
    appEl.style.setProperty('--vvh', h + 'px');
    appEl.style.transform = top ? 'translateY(' + top + 'px)' : '';
    app.W = w; app.H = h; app.dpr = dpr;
    [canvas, bg, layer].forEach(function (c) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); });
    lctx._grainPattern = null;
    app.L = CM.computeLayout(w, h, keyboard ? { top: 0, right: 0, bottom: 0, left: 0 } : readSafe(), { portrait: portrait, keyboard: keyboard });
    CM.chalk.renderBoard(bctx, app.L, dpr);
    app.relayoutDom();
    if (app.scene && app.scene.relayout) app.scene.relayout();
  }
  global.addEventListener('resize', function () { checkSize(); });
  if (vv) {
    vv.addEventListener('resize', function () { checkSize(); });
    vv.addEventListener('scroll', function () { checkSize(); });
  }

  // 手書きフォントを読み込んだら、黒板（消し残りの字）を描き直す
  if (document.fonts && document.fonts.load) {
    document.fonts.load('400 40px "Yomogi"', 'あいうえおアイウエオ漢字ABCabc123').then(function () {
      app.fontVersion++;
      checkSize(true);
    }).catch(function () {});
  }

  // ------------------------------------------------------------
  // 毎フレーム
  // ------------------------------------------------------------
  function render() {
    var dpr = app.dpr, L = app.L;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg, 0, 0);
    // チョークのレイヤー
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.clearRect(0, 0, layer.width, layer.height);
    var sh = app.fx.shakeOffset();
    lctx.setTransform(dpr, 0, 0, dpr, sh.x * dpr, sh.y * dpr);
    lctx.save();
    lctx.beginPath(); lctx.rect(L.board.x, L.board.y, L.board.w, L.board.h); lctx.clip();
    app.scene.drawChalk(lctx);
    app.fx.draw(lctx);
    lctx.restore();
    CM.chalk.applyGrain(lctx);
    ctx.drawImage(layer, 0, 0);
    // かすれない物
    ctx.setTransform(dpr, 0, 0, dpr, sh.x * dpr, sh.y * dpr);
    app.scene.drawReal(ctx);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!app.capture) app.chalk.draw(ctx, L, app.time);   // 撮影モードでは、チョーク残量を出さない
    app.realFx.draw(ctx);
  }

  var last = 0;
  app.time = 0;
  function frame(now) {
    var dt = last ? (now - last) / 1000 : 1 / 60;
    last = now;
    dt = Math.min(dt, 1 / 20); // 重いときも一気に進みすぎない
    app.time += dt;
    checkSize();
    app.fx.update(dt);
    app.realFx.update(dt);
    app.chalk.update(dt);
    app.scene.update(dt);
    render();
    global.requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', function () { last = 0; });

  /** 黒板の地の絵を、四角の範囲だけ上から重ねる（チョークを消したように見せる） */
  app.drawBoardPatch = function (c, x, y, w, h, alpha) {
    if (w <= 0 || h <= 0 || alpha <= 0) return;
    var d = app.dpr;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = alpha;
    c.drawImage(bg, x * d, y * d, w * d, h * d, x * d, y * d, w * d, h * d);
    c.restore();
  };
  /** 画面を切りかえる（'play'＝本編、'lab'＝確認用の画面） */
  app.go = function (name) {
    app.fx.clear(); app.realFx.clear();
    app.scene = app.scenes[name];
    app.scene.enter();
  };

  checkSize(true);
  app.scenes = { play: CM.createPlay(app), lab: CM.createLab(app) };
  app.go(/[?&]lab\b/.test(global.location.search) ? 'lab' : 'play');
  global.requestAnimationFrame(frame);
})(window);
