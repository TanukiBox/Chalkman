/*
 * CHALK MAN 本編（タイトル → 問題 → 書く → 判定 → 演出 → 結果 → 次の問題）
 *
 * ・問題は js/data/problems.js、黒板の様子は scenes.js、演出は acts.js。
 * ・ここには、演出を動かす係（D）も入っている：
 *     D.tween / D.walkTo / D.hop / D.all / D.follow など（使い方は acts.js の先頭）
 * ・失敗：チョーク −20 → 同じ問題をもう一度。0 になったら黒板消しに消されてゲームオーバー（エンディング8）
 * ・珍回答：先に進める。チョークは減らない。回数と「最後の珍回答」を覚えておく（エンディング・シェア用）
 * ・辞書にない言葉：首をかしげて文字が崩れる。チョークは減らずに書き直し
 */
(function (global) {
  'use strict';
  var CM = global.CM = global.CM || {};
  var U = CM.util, COL = CM.COL, CFG = CM.CFG, PI = Math.PI;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function btn(label, cls, onClick) {
    var b = el('button', 'cbtn' + (cls ? ' ' + cls : ''), label);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  }

  // ------------------------------------------------------------
  // 演出を動かす係（D）
  // ------------------------------------------------------------
  function makeDirector(app, sceneId, stageFx) {
    var L = app.L;
    var D = {
      app: app, st: L.stage, gy: L.groundY, s: L.s, dpr: app.dpr,
      T: function (k, p) { return app.i18n.t(k, p); }, lang: app.i18n.lang,
      fx: stageFx || app.fx, sfx: app.sfx, time: 0,
      // カメラ：ステージのまん中に映す場所 (cx, cy) と、大きさ z（1＝そのまま、0.5＝半分に引いた画）
      cam: { cx: L.stage.x + L.stage.w / 2, cy: L.stage.y + L.stage.h / 2, z: 1 },
      view: { x: L.stage.x, y: L.stage.y, w: L.stage.w, h: L.stage.h },
      sceneId: sceneId, sc: {}, actors: [], copies: [], w: null,
      held: null, heldRot: 0, heldFade: 1, tossY: 0, wordVisible: true,
      follows: [], chalkHooks: [], realHooks: [], eraser: null, thread: null, kind: null
    };

    /** カメラが今映している範囲（黒板の中の座標） */
    D.updateView = function () {
      var c = D.cam, st = D.st;
      D.view = { x: c.cx - st.w / 2 / c.z, y: c.cy - st.h / 2 / c.z, w: st.w / c.z, h: st.h / c.z };
    };
    /** 黒板の中の座標 → 画面の座標 */
    D.toScreen = function (x, y) {
      var c = D.cam, st = D.st;
      return { x: st.x + st.w / 2 + (x - c.cx) * c.z, y: st.y + st.h / 2 + (y - c.cy) * c.z };
    };
    /** カメラを動かす（sec 秒かけて） */
    D.camTo = function (to, sec) {
      var from = { cx: D.cam.cx, cy: D.cam.cy, z: D.cam.z };
      return D.tween(sec, function (k) {
        var e = U.easeInOut(k);
        D.cam.cx = U.lerp(from.cx, to.cx, e); D.cam.cy = U.lerp(from.cy, to.cy, e);
        D.cam.z = Math.exp(U.lerp(Math.log(from.z), Math.log(to.z), e));
        D.updateView();
      });
    };
    D.tween = function (sec, fn, ease) {
      var t = 0;
      fn(0);
      return function (dt) {
        t += dt;
        var k = Math.min(1, t / sec);
        fn(ease ? ease(k) : k);
        return k >= 1;
      };
    };
    D.all = function (list) {
      var done = list.map(function () { return false; });
      return function (dt) {
        var all = true;
        list.forEach(function (f, i) { if (!done[i]) done[i] = !!f(dt); if (!done[i]) all = false; });
        return all;
      };
    };
    D.follow = function (fn) { D.follows.push(fn); return fn; };
    D.unfollow = function (fn) { var i = D.follows.indexOf(fn); if (i >= 0) D.follows.splice(i, 1); };
    D.clearFollow = function () { D.follows.length = 0; };
    D.chalkHook = function (fn) { D.chalkHooks.push(fn); };
    D.realHook = function (fn) { D.realHooks.push(fn); };
    D.copy = function () {
      var c = CM.createWord(D.w.text, D.dpr);
      c.scale = D.w.scale; c.tint = D.w.tint;
      D.copies.push(c);
      return c;
    };
    D.addActor = function (x, f) { var a = makeActor(D, x, f); D.actors.push(a); return a; };
    D.removeActor = function (a) { var i = D.actors.indexOf(a); if (i > 0) D.actors.splice(i, 1); };
    /** 歩いて（遠ければ走って）x まで行く */
    D.walkTo = function (x, opt) {
      opt = opt || {};
      var a = opt.actor || D.man;
      var anim = opt.anim || (Math.abs(x - a.x) > 130 * D.s ? 'run' : 'walk');
      var speed = opt.speed || (anim === 'run' ? 115 * D.s : 42 * D.s);
      a.f = x >= a.x ? 1 : -1;
      a.play(anim);
      return function (dt) {
        var d = x - a.x, step = speed * dt;
        if (Math.abs(d) <= step) { a.x = x; a.play('idle'); return true; }
        a.x += (d > 0 ? 1 : -1) * step;
        return false;
      };
    };
    /** ぴょんと跳んで (x, gy) へ */
    D.hop = function (a, x1, gy1, h, sec) {
      var x0 = a.x, g0 = a.gy, t = 0;
      a.f = x1 >= x0 ? 1 : -1;
      a.play('hopAir');
      D.sfx.play('jump');
      return function (dt) {
        t += dt;
        var k = Math.min(1, t / sec);
        a.x = U.lerp(x0, x1, k); a.gy = U.lerp(g0, gy1, k); a.dy = -4 * h * k * (1 - k);
        if (k >= 1) {
          a.dy = 0; a.play('idle');
          D.fx.dust(a.x, a.gy, 5, { angle: -PI / 2, spread: 2.4, speed: 40, g: 120 });
          return true;
        }
        return false;
      };
    };
    var darkCv = null;
    /** 暗やみを描くための紙（半分の細かさで十分。c.k が倍率） */
    D.darkCanvas = function (w, h) {
      if (!darkCv) { darkCv = document.createElement('canvas'); darkCv.k = 0.5; }
      var cw = Math.ceil(w * darkCv.k), ch = Math.ceil(h * darkCv.k);
      if (darkCv.width !== cw || darkCv.height !== ch) { darkCv.width = cw; darkCv.height = ch; }
      return darkCv;
    };

    D.man = makeActor(D, 0, 1);
    D.actors.push(D.man);
    return D;
  }

  function makeActor(D, x, f) {
    var r = CM.createMan();
    var a = {
      x: x, gy: D.gy, f: f || 1, dy: 0, alpha: 1, freezeT: null, shake: false, armsUp: false, mouth: null, color: null,
      runner: r, frame: null, joints: null,
      play: function (n) { if (r.name !== n || n === 'jump') r.play(n); },
      get anim() { return r.name; }
    };
    return a;
  }

  function updateActor(D, a, dt) {
    var env = { stage: D.st, groundY: a.gy, cx: a.x, s: D.s * (a.k || 1), fixedX: a.x, f: a.f, shake: a.shake };
    var frozen = a.freezeT !== null;
    if (frozen) { a.runner.t = a.freezeT; dt = 0; }
    var fr = a.runner.update(dt, env, frozen ? null : function (id) { D.sfx.play(id); });
    var p = fr.pose;
    p.f = a.f;
    p.y += a.dy;
    p.alpha = (p.alpha === undefined ? 1 : p.alpha) * a.alpha;
    if (a.armsUp) { p.aF = [2.75, 0.3]; p.aB = [-2.75, -0.3]; }
    if (a.mouth) p.mouth = a.mouth;
    a.frame = fr;
  }

  // ------------------------------------------------------------
  // 本編
  // ------------------------------------------------------------
  CM.createPlay = function (app) {
    var T = function (k, p) { return app.i18n.t(k, p); };
    var padEl = document.getElementById('pad'), hudEl = document.getElementById('hud');
    var meter = app.chalk;
    var run = null;          // 1回の冒険の記録
    var store = app.store;

    // ---- セーブ ----
    //   run      … 遊んでいる途中の冒険（問題が始まるたびに保存。エンディング・ゲームオーバーで消す）
    //   endings  … 見たエンディング { 番号: 最後に書いた単語 }
    //   stats    … これまでに書いた単語の数、珍回答の回数、エンディングまで行った回数
    function stats() { return store.get('stats', { words: 0, funny: 0, clears: 0 }); }
    function addStat(k, n) { var st = stats(); st[k] = (st[k] || 0) + (n || 1); store.set('stats', st); }
    function saveRun() {
      if (!run) return;
      var r = {};
      for (var k in run) r[k] = run[k];
      r.chalk = meter.value;
      store.set('run', r);
    }
    function clearRun() { store.remove('run'); }
    function savedRun() { var r = store.get('run', null); return r && r.chapter ? r : null; }
    function seeEnding(n, word) { var e = store.get('endings', {}); e[n] = word || ''; store.set('endings', e); }
    CM.getSeenEndings = function () { return store.get('endings', {}); };
    // 答え図鑑：{ 問題のid: { 条件の番号: 書いた単語 } }（来ただけの問題は {}）
    CM.getAnswers = function () { return store.get('answers', {}); };
    function markSeen(prob) { var a = CM.getAnswers(); if (!a[prob.id]) { a[prob.id] = {}; store.set('answers', a); } }
    /** 見つけた答えを図鑑に書く。はじめて見つけたなら true */
    function addAnswer(prob, rule, word) {
      var i = prob && rule ? prob.rules.indexOf(rule) : -1;
      if (i < 0) return false;
      var a = CM.getAnswers(), got = a[prob.id] = a[prob.id] || {};
      if (got[i] !== undefined) return false;
      got[i] = word; store.set('answers', a);
      return true;
    }
    CM.getStats = stats;
    // ステージの中の粉や音の文字（カメラといっしょに動く）
    var stageFx = CM.createFx();
    stageFx.shake = function (a, d) { app.fx.shake(a, d); };
    var P = {
      state: 'title', D: null, sceneId: 'title', prob: null,
      word: null, writer: null, phase: 'none', phaseT: 0, fly: null,
      result: null, msg: '', msgKind: '', ngT: -1, trans: null, fadeIn: 1, stamp: null, busy: false, failAfterDone: false,
      time: 0, overT: 0
    };
    var ui = {};

    /** その章の問題（第2章は、通ってきたルートの問題だけ） */
    function chapterProblems(ch) {
      var route = run && run.route;
      return CM.PROBLEMS.filter(function (p) { return p.chapter === ch && (!p.route || p.route === (route || 'sky')); });
    }
    /** 章の名前（ルートで名前が変わる章もある） */
    function chapterName(ch) {
      var c = CM.CHAPTERS[ch] || {}, lang = app.i18n.lang;
      if (c[lang]) return c[lang];
      var r = c[(run && run.route) || 'sky'] || {};
      return r[lang] || '';
    }
    /** 全20問の中で何問目か（0から） */
    function globalQ() {
      var n = 0;
      for (var c = 1; c < run.chapter; c++) n += chapterProblems(c).length;
      return n + run.q;
    }

    // ---- シーン ----
    /**
     * 場面を作る
     *   opts.walkIn：棒人間が左から歩いて入ってくる
     *   opts.retry ：やり直し（はじめの見せ方＝カメラの寄り・引き は省く）
     */
    function setScene(sceneId, prob, opts) {
      opts = opts || {};
      P.sceneId = sceneId; P.prob = prob || null;
      stageFx.clear();
      var D = makeDirector(app, sceneId, stageFx);
      D.run = run;   // 通ってきたルートで、見た目を変える場面がある（第3章）
      var S = CM.SCENES[sceneId];
      S.setup(D.sc, D);
      if (D.sc.camIn) { var ci = opts.retry && D.sc.camOut ? D.sc.camOut : D.sc.camIn; D.cam = { cx: ci.cx, cy: ci.cy, z: ci.z }; }
      D.updateView();
      // シーンによっては、棒人間の立つ高さ（地面）が違う（1問目の高い所など）
      if (D.sc.gy !== undefined) D.gy = D.sc.gy;
      if (D.sc.floorY === undefined) D.sc.floorY = D.gy;
      D.man.gy = D.gy;
      D.man.x = D.sc.manX;
      D.man.play(D.sc.manAnim || 'idle');
      P.D = D;
      P.word = null; P.phase = 'none'; P.stamp = null;
      // はじめの見せ方：左から歩いて入る → （シーンによっては）カメラを引いて全体を見せる
      var walkIn = !!opts.walkIn && !D.sc.noWalkIn, intro = !opts.retry && S.intro;
      P.introLock = walkIn || !!intro;
      if (P.introLock) {
        var tx = D.man.x, anim = D.sc.manAnim || 'idle';
        if (walkIn) D.man.x = D.view.x - 40 * D.s;
        D.intro = { it: (function* () {
          if (walkIn) { yield 0.7; yield D.walkTo(tx, { anim: 'walk' }); D.man.play(anim); }
          if (intro) yield* S.intro(D.sc, D);
        })(), wait: 0, done: false };
      }
    }
    /**
     * 場面の切りかえ
     *   'scroll'：棒人間が右へ歩いていくと、黒板が横に流れて次の場所が見えてくる（新しい場面には左から歩いて入る）
     *   'fade'  ：ふわっと切りかえる（やり直し・タイトルなど）
     */
    function transitionTo(type, then) {
      if (type === 'scroll') {
        // 前の問題は見せない：いったん消えて、次の場所に棒人間が左から歩いて入ってくる
        P.trans = { type: 'fade', t: 0, dur: 0.35, then: function () { then(true); }, done: false };
      } else {
        P.trans = { type: 'fade', t: 0, dur: 0.3, then: then, done: false };
      }
    }

    // ---- 冒険の流れ ----
    function newGame() {
      run = { chapter: 1, q: 0, funny: 0, lastFunny: null, route: null, words: 0, funnyWords: [] };
      meter.set(CFG.CHALK_START);
      // プロローグ：理科の授業の図と、すみの落書きの棒人間
      transitionTo('fade', function () {
        setScene('prologue', null);
        P.D.man.alpha = 0;
        P.state = 'prologue';
        buildPad();
      });
    }
    /** 保存した冒険の、つづきから */
    function continueRun() {
      var r = savedRun();
      if (!r) return newGame();
      run = r;
      run.funnyWords = run.funnyWords || []; run.helped = run.helped || [];
      meter.set(r.chalk === undefined ? CFG.CHALK_START : r.chalk);
      goProblem(r.q || 0, 'fade');
    }
    /** 確認用：章とルートを決めて、その章の1問目から始める */
    function startAt(ch, route) {
      run = { chapter: ch, q: 0, funny: 0, lastFunny: null, route: route, words: 0, funnyWords: [] };
      meter.set(CFG.CHALK_START);
      goProblem(0, 'scroll');
    }
    function goProblem(i, how) {
      var list = chapterProblems(run.chapter);
      run.q = i;
      saveRun();
      transitionTo(how || 'scroll', function (scrolling) {
        setScene(list[i].scene, list[i], { walkIn: !!scrolling });
        markSeen(list[i]);
        P.state = 'input'; P.msg = ''; P.result = null;
        buildPad();
      });
    }
    function retry() {
      transitionTo('fade', function () {
        setScene(P.prob.scene, P.prob, { retry: true });
        P.state = 'input'; P.result = null;
        buildPad();
      });
    }
    function nextProblem() {
      var list = chapterProblems(run.chapter);
      if (P.prob && P.prob.last) goEnding();
      else if (run.q + 1 < list.length) goProblem(run.q + 1);
      else chapterClear();
    }
    /**
     * エンディングを決める（上が優先）
     *   8：黒板消し（チョーク0。ここには来ない）→ 7：珍回答10回以上 → 5・6：気持ち → 1〜4：ルート
     *   5・6 と 1〜4 は、チョークが 60 以上かどうかで分かれる
     */
    function decideEnding() {
      var hi = meter.value >= CFG.ENDING_CHALK;
      if (run.funny >= CFG.ENDING_FUNNY) return 7;
      if (run.ending === 'feel') return hi ? 5 : 6;
      if (run.route === 'under') return hi ? 3 : 4;
      return hi ? 1 : 2;
    }
    function goEnding(n) {
      n = n || decideEnding();
      run.endingNo = n;
      seeEnding(n, run.lastWord);
      addStat('clears');
      clearRun();
      transitionTo('fade', function () {
        setScene('ending', null);
        var sc = P.D.sc;
        sc.no = n; sc.word = run.lastWord || ''; sc.route = run.route || 'sky'; sc.funnyWords = run.funnyWords.slice();
        sc.hi = meter.value >= CFG.ENDING_CHALK;
        sc.helped = (run.helped || []).slice();
        P.state = 'ending';
        buildPad();
      });
    }
    function chapterClear() {
      transitionTo('fade', function () {
        setScene('title', null);
        P.D.sc.hideTitle = true;
        P.D.man.x = P.D.st.x + P.D.st.w * 0.5;
        P.D.man.play('cheer');
        P.state = 'clear';
        P.stamp = { key: 'clearTitleN', params: { n: run.chapter }, color: COL.yellow, t: 0 };
        buildPad();
        setTimeout(function () {
          var tip = meter.tipPos(app.L);
          meter.add(CFG.CHALK_CLEAR);
          app.sfx.play('heal');
          for (var k = 0; k < 6; k++) app.realFx.add({ type: 'star', x: tip[0] + (Math.random() - 0.5) * 40, y: tip[1] - Math.random() * 16, life: 0.7, size: 5, color: COL.yellow });
        }, 700);
      });
    }
    /** エンディング回収画面 */
    function openCollection() {
      transitionTo('fade', function () {
        setScene('collection', null);
        var seen = CM.getSeenEndings(), first = 1;
        for (var i = 1; i <= 8; i++) if (seen[i] !== undefined) { first = i; break; }
        P.D.sc.sel = first;
        P.state = 'collection';
        buildPad();
      });
    }
    /** シェアに使う、今回の冒険の記録 */
    function shareInfo() { return { ending: run.endingNo || 8, word: run.lastWord || '', lastFunny: run.lastFunny }; }
    function shareBtn() {
      return btn(T('shareBtn'), 'big share', function () { app.sfx.play('ui'); CM.share(shareInfo()); });
    }
    function toTitle() {
      transitionTo('fade', function () { setScene('title', null); P.state = 'title'; buildPad(); });
    }

    // ---- 書く ----
    function slateRect() {
      if (ui.slate && ui.slate.isConnected) {
        var r = ui.slate.getBoundingClientRect(), a = app.appRect();
        if (r.width > 10 && r.height > 10) return { x: r.left - a.left, y: r.top - a.top, w: r.width, h: r.height };
      }
      var L = app.L;
      return { x: L.pad.x + 10, y: L.pad.y + 60, w: L.pad.w - 20, h: 60 };
    }

    function submit() {
      if (P.state !== 'input' || P.busy) return;
      var text = ui.input ? ui.input.value.trim() : '';
      if (!text) return;
      if (ui.input) ui.input.blur();
      var r = CM.judgeWord(text, P.prob);
      if (r.kind === 'empty') return;
      P.result = r;
      if (r.kind === 'ng') {
        P.ngT = 0; P.msg = T('rewrite'); P.msgKind = 'ng';
        if (ui.input) ui.input.value = '';
        app.sfx.play('wipe');
        buildPad();
        return;
      }
      run.words++;
      addStat('words');
      P.msg = ''; P.busy = true;
      var w = CM.createWord(r.text, app.dpr);
      var sr = slateRect();
      w.scale = Math.min((sr.w * 0.92) / w.width, (sr.h * 0.8) / w.height, 1.1);
      w.x = sr.x + sr.w / 2; w.y = sr.y + sr.h / 2;
      P.word = w;
      P.writer = CM.createWriter(w, { fx: app.fx, onTap: function (q) { app.sfx.play('tap', q); } });
      P.phase = 'writing'; P.phaseT = 0;
      if (ui.input) ui.input.value = '';
      buildPad();
    }

    function stageScale(w) {
      var st = app.L.stage;
      // カメラを引いている場面では、文字を少し大きめに（小さくて読めなくならないように）
      var boost = (P.D && P.D.sc.wordBoost) || 1;
      return Math.min((st.w * 0.34) / w.width, (st.h * 0.13) / w.height) * boost;
    }

    function updateWriting(dt) {
      var w = P.word, D = P.D;
      if (!w) return;
      P.phaseT += dt;
      if (P.phase === 'writing') {
        P.writer.update(dt);
        if (P.writer.done) { P.phase = 'wait'; P.phaseT = 0; }
      } else if (P.phase === 'wait' && P.phaseT > 0.35) {
        var r = P.result;
        if (r.kind === 'unknown') {
          // 辞書にない：文字が崩れる。チョークは減らない
          P.phase = 'crumble'; P.phaseT = 0;
          w.off.forEach(function (o, i) { o.vy = -60 - Math.random() * 60; o.vx = (Math.random() - 0.5) * 60; o.vr = (Math.random() - 0.5) * 6; o.delay = i * 0.08 + Math.random() * 0.1; });
          app.sfx.play('crumble');
          D.man.play('puzzled');
        } else {
          // 着く場所は黒板の中の座標。飛んでいる間は画面の座標で動かす（カメラの寄り・引きに合わせる）
          var sc = stageScale(w), wy = D.gy - w.height * sc / 2 - 2, scr = D.toScreen(D.sc.restX, wy);
          P.fly = { x0: w.x, y0: w.y, s0: w.scale, s1: sc * D.cam.z, x1: scr.x, y1: scr.y, wx: D.sc.restX, wy: wy, ws: sc };
          app.sfx.play('lift');
          app.fx.dust(w.x, w.y + w.dispH() * 0.3, 14, { w: w.dispW(), speed: 30, g: 200, life: 0.8 });
          P.phase = 'lift'; P.phaseT = 0;
        }
      } else if (P.phase === 'crumble') {
        for (var i = 0; i < w.off.length; i++) {
          var o = w.off[i], tt = P.phaseT - o.delay;
          if (tt <= 0) { o.x = Math.sin(P.phaseT * 40 + i) * 1.5; continue; }
          o.vy += 900 * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.r += o.vr * dt;
          o.a = Math.max(0, 1 - tt / 1.1);
        }
        if (P.phaseT > 1.6) {
          P.word = null; P.phase = 'none'; P.busy = false;
          P.msg = T('unknownMsg2'); P.msgKind = 'unknown';
          D.man.play(D.sc.manAnim || 'idle');
          buildPad();
        }
      } else if (P.phase === 'lift') {
        var f = P.fly, k = U.easeInOut(U.clamp(P.phaseT / 0.8, 0, 1));
        w.resetPose();
        w.scale = U.lerp(f.s0, f.s1, k);
        w.x = U.lerp(f.x0, f.x1, k);
        w.y = U.lerp(f.y0, f.y1, k) - Math.sin(k * PI) * Math.min(120, app.L.stage.h * 0.3);
        w.rot = Math.sin(k * PI * 2) * 0.12;
        if (P.phaseT >= 0.8) {
          w.rot = 0;
          app.sfx.play('land');
          app.fx.dust(w.x, D.gy, 10, { angle: -PI / 2, spread: 2.6, speed: 60, g: 80 });
          startAct();
        }
      }
    }

    // ---- 演出 ----
    function startAct() {
      var D = P.D, r = P.result;
      D.w = P.word;
      // 画面の座標 → 黒板の中の座標へ
      D.w.x = P.fly.wx; D.w.y = P.fly.wy; D.w.scale = P.fly.ws;
      D.kind = r.kind;
      D.result = r;
      P.phase = 'act';
      P.failAfterDone = false;
      P.word = null;
      // 場面によっては、演出が始まっても姿勢をそのままにする（おなかがすいた・星に乗っている・ねむい など）
      D.man.play(D.sc.manAnim === 'hungry' || D.sc.keepAnim ? D.sc.manAnim : 'idle');
      var act = CM.ACTS[r.act] || CM.ACTS.fizzle;
      D.thread = { it: act(D), wait: 0, done: false };
    }
    function stepThread(th, dt) {
      if (!th || th.done) return;
      var w = th.wait;
      if (typeof w === 'number') { th.wait -= dt; if (th.wait > 0) return; }
      else if (typeof w === 'function') { if (!w(dt)) return; }
      var r = th.it.next();
      if (r.done) { th.done = true; return; }
      th.wait = r.value === undefined ? 0 : r.value;
    }
    function actFinished() {
      var D = P.D, r = P.result;
      P.phase = 'none';
      var kind = r.kind;
      if (kind === 'success' || kind === 'funny') {
        if (kind === 'funny') {
          run.funny++;
          addStat('funny');
          run.lastFunny = { chapter: run.chapter, q: globalQ() + 1, word: r.text, text: CM.fillWord(r.reaction[app.i18n.lang], r.text) };
          run.funnyWords.push(r.text);
        }
        if (r.route) run.route = r.route;
        (run.helped = run.helped || []).push(r.text);   // 冒険を助けたことば（エンディングで流す）
        if (P.prob && P.prob.last) { run.ending = r.ending || null; run.lastWord = r.text; }
        P.newAnswer = addAnswer(P.prob, r.rule, r.text);
        P.stamp = { key: kind === 'success' ? 'stamp_success' : 'stamp_funny', color: kind === 'success' ? COL.green : COL.yellow, t: 0 };
        app.sfx.play(kind === 'success' ? 'cheer' : 'sparkle');
        P.state = 'result';
        P.busy = false;
        buildPad();
      } else if (kind === 'fail' && P.prob && P.prob.failAfter && !P.failAfterDone && CM.ACTS[P.prob.failAfter.act]) {
        // 失敗したあとに続けて起きること（1問目：足元の線が崩れてドテッ）
        P.failAfterDone = true;
        P.phase = 'act';
        D.thread = { it: CM.ACTS[P.prob.failAfter.act](D), wait: 0, done: false };
        return;
      } else if (kind === 'fail' || kind === 'pinch') {
        P.stamp = { key: kind === 'pinch' ? 'stamp_pinch' : 'stamp_fail', color: COL.red, t: 0 };
        if (D.man.alpha > 0 && D.man.x < D.st.x + D.st.w) D.man.play('puzzled');
        var tip = meter.tipPos(app.L);
        var zero = meter.add(CFG.CHALK_FAIL);
        app.sfx.play('snap');
        for (var i = 0; i < 3; i++) {
          app.realFx.add({ type: 'shard', x: tip[0], y: tip[1], vx: (Math.random() - 0.5) * 120, vy: -120 - Math.random() * 80, g: 700, life: 0.7, size: 2.5 + Math.random() * 2.5, vr: (Math.random() - 0.5) * 20, color: '#f4f2ea' });
        }
        if (zero) {
          // チョークが 0：黒板消しに消される（エンディング8）
          P.state = 'dying'; P.overT = 0;
          run.endingNo = 8; seeEnding(8, ''); clearRun();
          D.man.x = Math.max(D.man.x, D.st.x + D.st.w * 0.3);
          D.man.alpha = 1; D.man.dy = 0; D.held = null; D.wordVisible = false;
          D.man.play('erased');
          buildPad();
        } else {
          P.state = 'result';
          P.busy = false;
          buildPad();
        }
      } else {
        // 特別な単語（チョークは減らない）：書き直し
        P.msg = CM.fillWord(r.reaction[app.i18n.lang], r.text); P.msgKind = 'retry';
        P.busy = false;
        retry();
      }
    }

    // ------------------------------------------------------------
    // 画面の部品
    // ------------------------------------------------------------
    function buildHud() {
      hudEl.innerHTML = '';
      if (P.state !== 'title') hudEl.appendChild(btn(T('toTitle'), 'small', function () { app.sfx.play('ui'); toTitle(); }));
      hudEl.appendChild(btn(T('lang'), 'small', function () {
        app.i18n.setLang(app.i18n.lang === 'ja' ? 'en' : 'ja');
        document.documentElement.lang = app.i18n.lang;
        app.sfx.play('ui');
        if (P.D) P.D.lang = app.i18n.lang;
        if (P.state === 'title' || P.state === 'input') setScene(P.sceneId, P.prob);
        buildPad();
      }));
      hudEl.appendChild(btn(app.sound.muted ? T('mute') : T('sound'), 'small' + (app.sound.muted ? '' : ' on'), function () {
        app.sound.toggle(); app.sfx.play('ui'); buildHud();
      }));
      // 撮影モード：ボタン・見出し・地図・チョーク残量を隠して、黒板と棒人間と書いた文字だけにする
      //   ボタンが横に広がって見出しとかぶらないように、「撮影」はタイトル画面だけ（撮影中は、どの画面でも「撮影中」だけ、うすく出る）
      if (P.state === 'title' || app.capture) hudEl.appendChild(btn(app.capture ? T('captureOff') : T('captureOn'), 'small cap-toggle' + (app.capture ? ' on' : ''), function () {
        app.capture = !app.capture;
        document.getElementById('app').classList.toggle('capture', app.capture);
        app.sfx.play('ui'); buildHud();
      }));
    }

    function addWriteRow(disabled) {
      ui.slate = el('div', 'slate');
      padEl.appendChild(ui.slate);
      var row = el('div', 'row');
      var input = el('input', 'cinput grow');
      input.type = 'text'; input.id = 'word-input';
      input.placeholder = T('placeholder');
      input.maxLength = CFG.WORD_MAX * 2;
      ['enterkeyhint:done', 'autocomplete:off', 'autocorrect:off', 'autocapitalize:off', 'spellcheck:false'].forEach(function (kv) {
        var p = kv.split(':'); input.setAttribute(p[0], p[1]);
      });
      input.disabled = !!disabled;
      input.addEventListener('input', function () {
        var cs = U.chars(input.value);
        if (cs.length > CFG.WORD_MAX) input.value = cs.slice(0, CFG.WORD_MAX).join('');
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); submit(); }
      });
      input.addEventListener('focus', function () { app.onInputFocus(true); });
      input.addEventListener('blur', function () { app.onInputFocus(false); });
      ui.input = input;
      row.appendChild(input);
      var b = btn(T('write'), '', submit);
      b.disabled = !!disabled;
      row.appendChild(b);
      padEl.appendChild(row);
    }

    /**
     * 場面に合わせて BGM を選ぶ
     *   タイトル・プロローグ・回収画面・第1章 … 教室　第2章 … 空／地下　第3章 … 夜明け（8時が近づくと速くなる）
     *   エンディング … いったん止めて、ファンファーレのあとに流す（scenes-ch3.js）　ゲームオーバー … 止める
     */
    function updateMusic() {
      var bgm = app.bgm, st = P.state;
      if (!bgm) return;
      if (st === 'dying' || st === 'over') { bgm.stop(1.5); return; }
      if (st === 'ending') { if (bgm.playing !== 'ending') bgm.stop(0.8); return; }
      if (st === 'title' || st === 'prologue' || st === 'collection' || !run) { bgm.play('classroom'); return; }
      if (run.chapter === 2) bgm.play(run.route === 'under' ? 'under' : 'sky');
      else if (run.chapter >= 3) { bgm.play('dawn'); bgm.setTempo(st === 'clear' ? 1 : 1 + run.q * 0.04); }
      else bgm.play('classroom');
    }

    /** 答え図鑑の書く欄：グループ（章・ルート）と、前・次 */
    function buildAnswersPad(csc) {
      var list = CM.answerList(), A = CM.getAnswers();
      csc.pi = Math.max(0, Math.min(list.length - 1, csc.pi || 0));
      var it = list[csc.pi];
      var groups = el('div', 'tabs probs');
      CM.ANSWER_GROUPS.forEach(function (g, gi) {
        var first = -1;
        for (var i = 0; i < list.length; i++) if (list[i].g === gi) { first = i; break; }
        groups.appendChild(btn(T(g.key), 'small' + (it.g === gi ? ' on' : ''), function () { app.sfx.play('ui'); csc.pi = first; buildPad(); }));
      });
      padEl.appendChild(groups);
      var nav = el('div', 'row');
      var prev = btn('◀', 'small', function () { app.sfx.play('ui'); csc.pi = (csc.pi - 1 + list.length) % list.length; buildPad(); });
      var next = btn('▶', 'small', function () { app.sfx.play('ui'); csc.pi = (csc.pi + 1) % list.length; buildPad(); });
      var c = CM.answerCount(it.p), seen = A[it.p.id] !== undefined;
      var mid = el('p', 'navlabel', T('qLabel', { n: it.no }) + '　' + (seen ? it.p.title[app.i18n.lang] + '　' + c.f + ' / ' + c.t : '？？？'));
      nav.appendChild(prev); nav.appendChild(mid); nav.appendChild(next);
      padEl.appendChild(nav);
    }

    function buildPad() {
      buildHud();
      updateMusic();
      padEl.innerHTML = '';
      ui.slate = null; ui.input = null;
      var st = P.state;
      if (st === 'prologue') {
        ['prologue1', 'prologue2', 'prologue3'].forEach(function (k) { padEl.appendChild(el('p', 'prompt', T(k))); });
        padEl.appendChild(btn(T('depart'), 'big', function () { app.sfx.play('ui'); goProblem(0, 'scroll'); }));
      } else if (st === 'title') {
        padEl.appendChild(el('p', 'prompt', T('titleNote')));
        var sv = savedRun();
        if (sv) {
          var svN = sv.q + 1 + (sv.chapter >= 2 ? 6 : 0) + (sv.chapter >= 3 ? 7 : 0);
          padEl.appendChild(btn(T('continue', { n: svN }), 'big', function () { app.sfx.play('ui'); continueRun(); }));
          padEl.appendChild(btn(T('startOver'), '', function () { app.sfx.play('ui'); clearRun(); newGame(); }));
        } else {
          padEl.appendChild(btn(T('start'), 'big', function () { app.sfx.play('ui'); newGame(); }));
        }
        padEl.appendChild(btn(T('collection'), '', function () { app.sfx.play('ui'); openCollection(); }));
        // BGM だけ消す（効果音は鳴る）
        padEl.appendChild(btn(app.bgm.enabled ? T('bgmOn') : T('bgmOff'), 'small' + (app.bgm.enabled ? ' on' : ''), function () {
          app.bgm.enabled = !app.bgm.enabled; app.sfx.play('ui'); buildPad();
        }));
        // 確認用のボタン（config.js の DEV_BUTTONS が false なら出さない）
        if (CFG.DEV_BUTTONS) {
          padEl.appendChild(btn(T('toLab'), 'small', function () { app.sfx.play('ui'); app.go('lab'); }));
          // 確認用（試遊のあいだだけ）：第2章から始める
          var tr = el('div', 'row kb-hide');
          [[2, 'sky', 'testSky'], [2, 'under', 'testUnder'], [3, 'sky', 'testCh3']].forEach(function (d) {
            tr.appendChild(btn(T(d[2]), 'small', function () { app.sfx.play('ui'); startAt(d[0], d[1]); }));
          });
          padEl.appendChild(tr);
        }
      } else if (st === 'input' || st === 'result' || st === 'dying') {
        var list = chapterProblems(run.chapter);
        padEl.appendChild(el('p', 'qnum kb-hide', chapterName(run.chapter) + '　' + (run.q + 1) + ' / ' + list.length));
        if (st === 'result') {
          var r = P.result, kind = r.kind;
          padEl.appendChild(el('p', 'rmain k-' + kind, T('kind_' + kind)));
          var msg = CM.fillWord(r.reaction[app.i18n.lang], r.text);
          if (kind === 'fail' && P.prob.failAfter) msg += P.prob.failAfter[app.i18n.lang];
          padEl.appendChild(el('p', 'rmsg big', msg));
          if ((kind === 'success' || kind === 'funny') && P.newAnswer) padEl.appendChild(el('p', 'new-answer kb-hide', T('newAnswer', CM.answerCount(P.prob))));
          if (kind === 'success' || kind === 'funny') padEl.appendChild(btn(T(P.prob.last ? 'toEnding' : 'next'), 'big', function () { app.sfx.play('ui'); nextProblem(); }));
          else padEl.appendChild(btn(T('retryBtn'), 'big', function () { app.sfx.play('ui'); retry(); }));
        } else {
          var rt = P.prob.routeText && P.prob.routeText[run.route || 'sky'];
          padEl.appendChild(el('p', 'prompt', P.prob.text[app.i18n.lang] + (rt ? ' ' + rt[app.i18n.lang] : '')));
          addWriteRow(P.busy || P.introLock || st === 'dying');
          if (P.msg) padEl.appendChild(el('p', 'rmsg k-' + P.msgKind, P.msg));
        }
      } else if (st === 'clear') {
        padEl.appendChild(el('p', 'rmain k-success', T('clearTitleN', { n: run.chapter }) + '　' + T('chalkPlus')));
        if (run.chapter === 1) padEl.appendChild(el('p', 'rmsg big', T(run.route === 'under' ? 'route_under' : 'route_sky')));
        else padEl.appendChild(el('p', 'rmsg big', T(run.route === 'under' ? 'ch2done_under' : 'ch2done_sky')));
        padEl.appendChild(el('p', 'note', T('funnyCount', { n: run.funny }) + (CM.CHAPTERS[run.chapter + 1] ? '' : '　' + T('toBeContinued'))));
        if (CM.CHAPTERS[run.chapter + 1]) padEl.appendChild(btn(T('nextChapter', { n: run.chapter + 1 }), 'big', function () { app.sfx.play('ui'); run.chapter++; goProblem(0, 'scroll'); }));
        else padEl.appendChild(btn(T('restart'), 'big', function () { app.sfx.play('ui'); newGame(); }));
        padEl.appendChild(btn(T('toTitle'), 'small', function () { app.sfx.play('ui'); toTitle(); }));
      } else if (st === 'ending') {
        var E = CM.ENDINGS[run.endingNo], lang = app.i18n.lang, w = run.lastWord || '';
        padEl.appendChild(el('p', 'rmain k-success', T('endingN', { n: run.endingNo }) + '　' + CM.fillWord(E.title[lang], w)));
        var txt = E.text[lang];
        if (E.routeText) txt = E.routeText[run.route || 'sky'][lang] + txt;
        padEl.appendChild(el('p', 'rmsg big', CM.fillWord(txt, w)));
        padEl.appendChild(el('p', 'note', T('funnyCount', { n: run.funny }) + '　' + T('chalkLeftN', { n: Math.round(meter.value) })));
        padEl.appendChild(shareBtn());
        padEl.appendChild(btn(T('playAgain'), '', function () { app.sfx.play('ui'); newGame(); }));
        padEl.appendChild(btn(T('toTitle'), 'small', function () { app.sfx.play('ui'); toTitle(); }));
      } else if (st === 'collection') {
        var seen = CM.getSeenEndings(), sel = P.D.sc.sel, ss = stats(), lg = app.i18n.lang, csc = P.D.sc;
        // タブ：エンディング／答え図鑑
        var tabs = el('div', 'tabs');
        [['endings', 'tabEndings'], ['answers', 'tabAnswers']].forEach(function (d) {
          tabs.appendChild(btn(T(d[1]), 'small' + (csc.mode === d[0] ? ' on' : ''), function () { app.sfx.play('ui'); csc.mode = d[0]; buildPad(); }));
        });
        padEl.appendChild(tabs);
        if (csc.mode === 'answers') {
          buildAnswersPad(csc);
          padEl.appendChild(btn(T('toTitle'), 'small', function () { app.sfx.play('ui'); toTitle(); }));
          app.relayoutDom();
          return;
        }
        padEl.appendChild(el('p', 'note kb-hide', T('statsLine', { e: Object.keys(seen).length, w: ss.words || 0, f: ss.funny || 0 })));
        var grid = el('div', 'tabs probs');
        for (var ci = 1; ci <= 8; ci++) (function (n) {
          grid.appendChild(btn(seen[n] !== undefined ? '★' + n : String(n), 'small' + (sel === n ? ' on' : '') + (seen[n] !== undefined ? '' : ' dim'), function () { app.sfx.play('ui'); P.D.sc.sel = n; buildPad(); }));
        })(ci);
        padEl.appendChild(grid);
        var CE = CM.ENDINGS[sel];
        if (seen[sel] !== undefined) {
          padEl.appendChild(el('p', 'rmain k-success', T('endingN', { n: sel }) + '　' + CM.fillWord(CE.title[lg], seen[sel] || '…')));
          padEl.appendChild(el('p', 'rmsg', CM.fillWord(CE.text[lg], seen[sel] || '…')));
        } else {
          padEl.appendChild(el('p', 'rmain', T('endingN', { n: sel }) + '　？？？'));
          padEl.appendChild(el('p', 'rmsg', T('hintLabel') + CE.hint[lg]));
        }
        padEl.appendChild(btn(T('toTitle'), 'small', function () { app.sfx.play('ui'); toTitle(); }));
      } else if (st === 'over') {
        padEl.appendChild(el('p', 'rmain k-fail', T('gameOver')));
        padEl.appendChild(el('p', 'rmsg big', T('end8')));
        padEl.appendChild(shareBtn());
        padEl.appendChild(btn(T('restart'), '', function () { app.sfx.play('ui'); newGame(); }));
        padEl.appendChild(btn(T('toTitle'), 'small', function () { app.sfx.play('ui'); toTitle(); }));
      }
      app.relayoutDom();
    }

    // ------------------------------------------------------------
    // 毎フレーム
    // ------------------------------------------------------------
    var api = {
      enter: function () {
        if (!P.D) setScene('title', null);
        P.state = P.state === 'title' || !run ? 'title' : P.state;
        if (P.state === 'title') setScene('title', null);
        buildPad();
        // 確認用：URL に ?q=3 を付けると、その問題から始める
        //   第2章は ?q=7（空ルート）、?q=7&r=under（地下ルート）
        // 確認用：?end=5（エンディング5を見る。&r=under で地下ルート、&w=ありがとう で最後の単語）
        var me = /[?&]end=(\d)/.exec(global.location.search);
        if (me && !run) {
          var rr = /[?&]r=(sky|under)/.exec(global.location.search), ww = /[?&]w=([^&]+)/.exec(global.location.search);
          run = { chapter: 3, q: 6, funny: 0, lastFunny: null, route: rr ? rr[1] : 'sky', words: 0, funnyWords: [] };
          run.lastWord = ww ? decodeURIComponent(ww[1]) : 'ありがとう';
          if (+me[1] === 7) run.funnyWords = ['アリ', 'すずめ', 'せんせい', 'たいこ', 'ねこ', 'おかあさん', 'ケーキ', 'よる', 'はな', 'くも'];
          run.helped = ['でんき', 'ロープ', 'ボール', 'ひこうき', 'ケーキ', 'はしご', 'まくら', 'たいこ', 'かさ', 'けしごむ', 'かぎ', run.lastWord];
          run.funny = run.funnyWords.length;
          meter.set([2, 4, 6].indexOf(+me[1]) >= 0 ? 40 : 80);
          goEnding(+me[1]);
          return;
        }
        var m = /[?&]q=(\d+)/.exec(global.location.search);
        if (m && !run) {
          var rm = /[?&]r=(sky|under)/.exec(global.location.search);
          run = { chapter: 1, q: 0, funny: 0, lastFunny: null, route: rm ? rm[1] : null, words: 0, funnyWords: [] };
          meter.set(CFG.CHALK_START);
          var n = parseInt(m[1], 10) - 1;
          while (CM.CHAPTERS[run.chapter + 1] && n >= chapterProblems(run.chapter).length) {
            n -= chapterProblems(run.chapter).length; run.chapter++;
            if (!run.route) run.route = 'sky';
          }
          goProblem(U.clamp(n, 0, chapterProblems(run.chapter).length - 1));
        }
      },
      relayout: function () {
        // 入力を待っている間なら、新しい大きさで黒板を並べ直す
        if (P.D && (P.state === 'input' || P.state === 'title' || P.state === 'prologue') && !P.busy && !P.trans) setScene(P.sceneId, P.prob, { retry: true });
      },
      update: function (dt) {
        P.time += dt;
        var D = P.D;
        if (P.trans) {
          var tr = P.trans;
          tr.t += dt;
          if (tr.type === 'fade') {
            if (!tr.done && tr.t >= tr.dur) { tr.done = true; tr.then(); P.fadeIn = 0; D = P.D; }
            if (tr.t >= tr.dur + 0.05) P.trans = null;
          } else if (tr.t >= tr.dur) P.trans = null;
        }
        P.fadeIn = Math.min(1, P.fadeIn + dt * 2.5);
        if (P.stamp) P.stamp.t += dt;
        if (P.ngT >= 0) {
          var prev = P.ngT;
          P.ngT += dt;
          if (prev < 0.2 && P.ngT >= 0.2) { var sr0 = slateRect(); app.fx.dust(sr0.x + sr0.w / 2, sr0.y + sr0.h / 2, 16, { w: sr0.w * 0.8, h: sr0.h * 0.5, speed: 30, g: 150, life: 0.9 }); }
          if (P.ngT > 3) P.ngT = -1;
        }
        stageFx.update(dt);
        if (!D) return;
        D.time += dt;
        D.updateView();
        var S = CM.SCENES[P.sceneId];
        if (S.update) S.update(D.sc, dt, D);
        updateWriting(dt);
        if (D.intro) {
          stepThread(D.intro, dt);
          if (D.intro.done) { D.intro = null; if (P.introLock) { P.introLock = false; if (P.state === 'input') buildPad(); } }
        }
        // プロローグ：落書きの棒人間が、すーっと浮かび上がる
        if (P.state === 'prologue' && D.man.alpha < 1) D.man.alpha = Math.min(1, D.man.alpha + dt * 0.7);
        if (P.phase === 'act' && D.thread) {
          stepThread(D.thread, dt);
          if (D.thread.done) actFinished();
        }
        for (var i = D.follows.length - 1; i >= 0; i--) {
          var f = D.follows[i];
          if (f(dt) === true) { var j = D.follows.indexOf(f); if (j >= 0) D.follows.splice(j, 1); }
        }
        D.actors.forEach(function (a) { updateActor(D, a, dt); });
        if (P.state === 'dying' || P.state === 'over') {
          P.overT += dt;
          if (D.man.runner.t > 2.9) D.man.runner.t = 2.9;
        }
        if (P.state === 'dying') {
          if (P.overT > 3.2) { P.state = 'over'; P.stamp = { key: 'gameOver', color: COL.red, t: 0 }; app.sfx.play('gameover'); buildPad(); }
        }
      },
      drawChalk: function (ctx) {
        var D = P.D, L = app.L, st = L.stage;
        if (!D) return;
        ctx.save();
        ctx.beginPath(); ctx.rect(st.x, st.y, st.w, st.h); ctx.clip();
        if (P.trans && P.trans.type === 'scroll') {
          // 黒板が横に流れる：前の場所は左へ、次の場所は右から
          var k = U.easeInOut(Math.min(1, P.trans.t / P.trans.dur));
          ctx.save(); ctx.translate(-k * st.w, 0); stageChalk(ctx, P.trans.old.D, P.trans.old.sceneId); ctx.restore();
          ctx.save(); ctx.translate((1 - k) * st.w, 0); stageChalk(ctx, D, P.sceneId); ctx.restore();
        } else stageChalk(ctx, D, P.sceneId);
        ctx.restore();
        // 書く欄
        if (ui.slate) {
          var sr = slateRect();
          CM.chalk.line(ctx, [sr.x + 6, sr.y + sr.h - 2, sr.x + sr.w - 6, sr.y + sr.h - 2], { w: 1.6, alpha: 0.3, seed: 5, wob: 0.6 });
          if (P.ngT > 0.35) {
            var al = Math.min(1, (P.ngT - 0.35) / 0.25) * Math.min(1, (3 - P.ngT) / 0.4);
            CM.chalk.text(ctx, T('rewrite'), sr.x + sr.w / 2, sr.y + sr.h / 2, { size: Math.min(28, sr.h * 0.5), color: COL.yellow, alpha: al, maxW: sr.w * 0.9 });
          }
        }
        if (P.word) P.word.draw(ctx);
      },
      drawReal: function (ctx) {
        var D = P.D, L = app.L, st = L.stage;
        if (!D) return;
        ctx.save();
        ctx.beginPath(); ctx.rect(st.x, st.y, st.w, st.h); ctx.clip();
        if (P.trans && P.trans.type === 'scroll') {
          var k = U.easeInOut(Math.min(1, P.trans.t / P.trans.dur));
          ctx.save(); ctx.translate(-k * st.w, 0); stageReal(ctx, P.trans.old.D, P.trans.old.sceneId); ctx.restore();
          ctx.save(); ctx.translate((1 - k) * st.w, 0); stageReal(ctx, D, P.sceneId); ctx.restore();
        } else stageReal(ctx, D, P.sceneId);
        ctx.restore();
        // 見出しと、黒板の地図（暗やみの上にも見えるように、ここで描く）
        if (P.prob && run && P.state !== 'prologue' && !app.capture) {
          CM.chalk.text(ctx, (globalQ() + 1) + '. ' + P.prob.title[app.i18n.lang], st.x + 14, st.y + 22, { size: 18, align: 'left', color: COL.yellow, maxW: st.w - 192 });
          drawMap(ctx, st, globalQ());
        }
        // 結果のはんこ
        if (P.stamp) {
          var ks = U.easeBack(U.clamp(P.stamp.t / 0.35, 0, 1));
          var sz = Math.min(44, st.w / 9);
          ctx.save();
          ctx.translate(st.x + st.w / 2, st.y + st.h * (P.state === 'clear' ? 0.3 : 0.45));
          ctx.rotate(-0.08);
          ctx.scale(ks, ks);
          CM.chalk.text(ctx, T(P.stamp.key, P.stamp.params), 0, 0, { size: sz, color: P.stamp.color, maxW: st.w * 0.9 });
          if (P.stamp.key === 'gameOver') CM.chalk.text(ctx, T('end8'), 0, sz, { size: sz * 0.45, color: COL.chalk, maxW: st.w * 0.9 });
          ctx.restore();
        }
        if (P.phase === 'writing' && P.writer) P.writer.drawTip(ctx);
        // NG：書く欄を黒板消しが拭く
        if (P.ngT >= 0 && P.ngT < 0.75) {
          var sr = slateRect(), kn = U.easeInOut(P.ngT / 0.75);
          CM.props.realEraser(ctx, { x: U.lerp(sr.x + sr.w + 30, sr.x - 30, kn), y: sr.y + sr.h / 2 + Math.sin(P.ngT * 30) * 4, rot: 0.05, s: Math.max(0.9, sr.h / 40) });
        }
        // ふわっと切りかえ
        if (P.trans && P.trans.type === 'fade' && !P.trans.done) {
          app.drawBoardPatch(ctx, st.x, st.y, st.w, st.h, Math.min(1, P.trans.t / P.trans.dur));
        } else if (P.fadeIn < 1) {
          app.drawBoardPatch(ctx, st.x, st.y, st.w, st.h, 1 - P.fadeIn);
        }
      }
    };

    /** ステージのチョークで描く物（シーン・文字・棒人間） */
    /** カメラの寄り・引きを、描く前にかける */
    function applyCam(ctx, D) {
      var c = D.cam, st = D.st;
      if (c.z === 1 && c.cx === st.x + st.w / 2 && c.cy === st.y + st.h / 2) return;
      ctx.translate(st.x + st.w / 2, st.y + st.h / 2);
      ctx.scale(c.z, c.z);
      ctx.translate(-c.cx, -c.cy);
    }
    function stageChalk(ctx, D, sceneId) {
      ctx.save();
      applyCam(ctx, D);
      stageChalkInner(ctx, D, sceneId);
      if (D === P.D) stageFx.draw(ctx);
      ctx.restore();
    }
    function stageChalkInner(ctx, D, sceneId) {
      var S = CM.SCENES[sceneId], st = D.st;
      if (S.drawChalk) S.drawChalk(ctx, D.sc, D);
      D.chalkHooks.forEach(function (h) { h(ctx, D.time); });
      D.copies.forEach(function (c) { c.draw(ctx); });
      // 棒人間（と、手に持った文字）
      D.actors.forEach(function (a) {
        if (!a.frame) return;
        var j = CM.drawMan(ctx, a.frame.pose, D.s * (a.k || 1), D.time, { color: a.color });
        a.joints = j;
        var ex = a.frame.extras || {};
        if (ex.eraseFrom !== undefined && ex.eraseFrom !== null && (P.state === 'dying' || P.state === 'over') && D === P.D) {
          ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000';
          ctx.fillRect(ex.eraseFrom, ex.eraseBox.y0, st.x + st.w - ex.eraseFrom + 50, ex.eraseBox.y1 - ex.eraseBox.y0);
          ctx.restore();
        }
        if (a === D.man && D.held === 'swing' && ex.trail) CM.props.trail(ctx, j, D.s, ex.trail, (CM.BODY.uarm + CM.BODY.farm) * D.s + 60 * D.s);
      });
      if (D.w && D.wordVisible) {
        if (D.held && D.man.joints) placeHeld(D);
        D.w.draw(ctx);
      }
      if (S.drawFront) S.drawFront(ctx, D.sc, D);
    }

    /** ステージの上に重ねる物（暗やみ・黒板消し など） */
    function stageReal(ctx, D, sceneId) {
      ctx.save();
      applyCam(ctx, D);
      stageRealInner(ctx, D, sceneId);
      ctx.restore();
    }
    function stageRealInner(ctx, D, sceneId) {
      var S = CM.SCENES[sceneId], L = app.L;
      if (S.drawReal) S.drawReal(ctx, D.sc, D);
      D.realHooks.forEach(function (h) { h(ctx, D.time); });
      var ex = (D.man.frame && D.man.frame.extras) || {};
      if ((P.state === 'dying' || P.state === 'over') && D === P.D) {
        if (ex.smear) CM.props.realSmear(ctx, ex.smear, D.s);
        if (ex.eraser) CM.props.realEraser(ctx, ex.eraser);
      }
      if (D.eraser) CM.props.realEraser(ctx, D.eraser);
    }

    /** 黒板の地図：全20問の中で、今どこにいるか（右はしが自由帳＝出口） */
    function drawMap(ctx, st, q) {
      var total = CM.TOTAL_PROBLEMS || 20, groups = [6, 7, 7];
      var sp = Math.min(11, (st.w * 0.5) / (total + 2)), x = st.x + 16, y = st.y + 46;
      var pts = [], i = 0;
      groups.forEach(function (n, g) {
        for (var k = 0; k < n; k++, i++) pts.push(x + i * sp + g * sp * 0.8);
      });
      var endX = pts[pts.length - 1] + sp * 1.6;
      CM.chalk.line(ctx, [pts[0], y, endX, y], { w: 1.2, alpha: 0.35, seed: 3, wob: 0.3 });
      pts.forEach(function (px, k) {
        if (k === q) CM.chalk.circle(ctx, px, y, 4, { w: 2, color: COL.yellow, seed: 7 });
        else {
          ctx.save();
          ctx.globalAlpha = k < q ? 0.85 : 0.35;
          ctx.fillStyle = COL.chalk;
          ctx.beginPath(); ctx.arc(px, y, k < q ? 2.4 : 1.8, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      });
      // 自由帳（出口）
      ctx.save();
      ctx.strokeStyle = COL.chalk; ctx.globalAlpha = 0.7; ctx.lineWidth = 1.4;
      ctx.strokeRect(endX, y - 6, 9, 12);
      ctx.restore();
      CM.chalk.text(ctx, T('mapGoal'), endX + 14, y, { size: 12, align: 'left', alpha: 0.7 });
    }

    /** 手に持った文字の位置 */
    function placeHeld(D) {
      var w = D.w, j = D.man.joints, s = D.s, f = j.f;
      w.alpha = D.heldFade;
      var target = { swing: 64, front: 50, overhead: 70, mouth: 50, dig: 48, toss: 50 }[D.held] || 50;
      w.scale = (target * s) / w.width;
      if (w.dispH() > 34 * s) w.scale = (34 * s) / w.height;
      if (D.held === 'swing') {
        var a = j.handAngleF, dx = Math.sin(a) * f, dy = Math.cos(a), len = w.dispW();
        w.x = j.handF[0] + dx * (len / 2 - 4 * s); w.y = j.handF[1] + dy * (len / 2 - 4 * s);
        w.rot = Math.atan2(dy, dx);
      } else if (D.held === 'overhead') {
        w.x = j.head[0]; w.y = j.head[1] - 20 * s - w.dispH() / 2; w.rot = 0;
      } else if (D.held === 'mouth') {
        w.x = j.head[0] + f * (16 * s + w.dispW() * 0.35); w.y = j.head[1] + 12 * s; w.rot = D.heldRot * f;
      } else if (D.held === 'dig') {
        w.x = j.handF[0] + f * 10 * s; w.y = j.handF[1] + 12 * s; w.rot = f * 1.1;
      } else {
        w.x = j.handF[0] + f * 8 * s; w.y = j.handF[1] - 6 * s + (D.held === 'toss' ? D.tossY : 0);
        w.rot = D.held === 'toss' ? D.tossY * 0.05 : D.heldRot * f;
      }
    }

    return api;
  };
})(window);
