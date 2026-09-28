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
  function makeDirector(app, sceneId) {
    var L = app.L;
    var D = {
      app: app, st: L.stage, gy: L.groundY, s: L.s, dpr: app.dpr,
      T: function (k, p) { return app.i18n.t(k, p); }, lang: app.i18n.lang,
      fx: app.fx, sfx: app.sfx, time: 0,
      sceneId: sceneId, sc: {}, actors: [], copies: [], w: null,
      held: null, heldRot: 0, heldFade: 1, tossY: 0, wordVisible: true,
      follows: [], chalkHooks: [], realHooks: [], eraser: null, thread: null, kind: null
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
    var env = { stage: D.st, groundY: a.gy, cx: a.x, s: D.s, fixedX: a.x, f: a.f, shake: a.shake };
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
    var P = {
      state: 'title', D: null, sceneId: 'title', prob: null,
      word: null, writer: null, phase: 'none', phaseT: 0, fly: null,
      result: null, msg: '', msgKind: '', ngT: -1, trans: null, fadeIn: 1, stamp: null, busy: false, failAfterDone: false,
      time: 0, overT: 0
    };
    var ui = {};

    function chapterProblems(ch) { return CM.PROBLEMS.filter(function (p) { return p.chapter === ch; }); }

    // ---- シーン ----
    function setScene(sceneId, prob) {
      P.sceneId = sceneId; P.prob = prob || null;
      var D = makeDirector(app, sceneId);
      var S = CM.SCENES[sceneId];
      S.setup(D.sc, D);
      // シーンによっては、棒人間の立つ高さ（地面）が違う（1問目の高い所など）
      if (D.sc.gy !== undefined) D.gy = D.sc.gy;
      if (D.sc.floorY === undefined) D.sc.floorY = D.gy;
      D.man.gy = D.gy;
      D.man.x = D.sc.manX;
      D.man.play(D.sc.manAnim || 'idle');
      P.D = D;
      P.word = null; P.phase = 'none'; P.stamp = null;
    }
    /**
     * 場面の切りかえ
     *   'scroll'：棒人間が右へ歩いていくと、黒板が横に流れて次の場所が見えてくる（新しい場面には左から歩いて入る）
     *   'fade'  ：ふわっと切りかえる（やり直し・タイトルなど）
     */
    function transitionTo(type, then) {
      if (type === 'scroll' && P.D) {
        var old = { D: P.D, sceneId: P.sceneId };
        then();
        P.trans = { type: 'scroll', t: 0, dur: 1.1, old: old };
        var D = P.D, tx = D.man.x, anim = D.sc.manAnim || 'idle';
        D.man.x = D.st.x - 40 * D.s;
        D.intro = { it: (function* () { yield 0.7; yield D.walkTo(tx, { anim: 'walk' }); D.man.play(anim); })(), wait: 0, done: false };
      } else {
        P.trans = { type: 'fade', t: 0, dur: 0.3, then: then, done: false };
      }
    }

    // ---- 冒険の流れ ----
    function newGame() {
      run = { chapter: 1, q: 0, funny: 0, lastFunny: null, route: null, words: 0 };
      meter.set(CFG.CHALK_START);
      // プロローグ：理科の授業の図と、すみの落書きの棒人間
      transitionTo('fade', function () {
        setScene('prologue', null);
        P.D.man.alpha = 0;
        P.state = 'prologue';
        buildPad();
      });
    }
    function goProblem(i, how) {
      var list = chapterProblems(run.chapter);
      run.q = i;
      transitionTo(how || 'scroll', function () {
        setScene(list[i].scene, list[i]);
        P.state = 'input'; P.msg = ''; P.result = null;
        buildPad();
      });
    }
    function retry() {
      transitionTo('fade', function () {
        setScene(P.prob.scene, P.prob);
        P.state = 'input'; P.result = null;
        buildPad();
      });
    }
    function nextProblem() {
      var list = chapterProblems(run.chapter);
      if (run.q + 1 < list.length) goProblem(run.q + 1);
      else chapterClear();
    }
    function chapterClear() {
      transitionTo('fade', function () {
        setScene('title', null);
        P.D.sc.hideTitle = true;
        P.D.man.x = P.D.st.x + P.D.st.w * 0.5;
        P.D.man.play('cheer');
        P.state = 'clear';
        P.stamp = { key: 'clearTitle', color: COL.yellow, t: 0 };
        buildPad();
        setTimeout(function () {
          var tip = meter.tipPos(app.L);
          meter.add(CFG.CHALK_CLEAR);
          app.sfx.play('heal');
          for (var k = 0; k < 6; k++) app.realFx.add({ type: 'star', x: tip[0] + (Math.random() - 0.5) * 40, y: tip[1] - Math.random() * 16, life: 0.7, size: 5, color: COL.yellow });
        }, 700);
      });
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
      return Math.min((st.w * 0.34) / w.width, (st.h * 0.13) / w.height);
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
          var sc = stageScale(w);
          P.fly = { x0: w.x, y0: w.y, s0: w.scale, s1: sc, x1: D.sc.restX, y1: D.gy - w.height * sc / 2 - 2 };
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
      D.kind = r.kind;
      P.phase = 'act';
      P.failAfterDone = false;
      P.word = null;
      D.man.play(D.sc.manAnim === 'hungry' ? 'hungry' : 'idle');
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
          run.lastFunny = { chapter: run.chapter, q: run.q + 1, word: r.text, text: CM.fillWord(r.reaction[app.i18n.lang], r.text) };
        }
        if (r.route) run.route = r.route;
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

    function buildPad() {
      buildHud();
      padEl.innerHTML = '';
      ui.slate = null; ui.input = null;
      var st = P.state;
      if (st === 'prologue') {
        ['prologue1', 'prologue2', 'prologue3'].forEach(function (k) { padEl.appendChild(el('p', 'prompt', T(k))); });
        padEl.appendChild(btn(T('depart'), 'big', function () { app.sfx.play('ui'); goProblem(0, 'scroll'); }));
      } else if (st === 'title') {
        padEl.appendChild(el('p', 'prompt', T('titleNote')));
        padEl.appendChild(btn(T('start'), 'big', function () { app.sfx.play('ui'); newGame(); }));
        padEl.appendChild(btn(T('toLab'), 'small', function () { app.sfx.play('ui'); app.go('lab'); }));
      } else if (st === 'input' || st === 'result' || st === 'dying') {
        var list = chapterProblems(run.chapter);
        padEl.appendChild(el('p', 'qnum kb-hide', CM.CHAPTERS[run.chapter][app.i18n.lang] + '　' + (run.q + 1) + ' / ' + list.length));
        if (st === 'result') {
          var r = P.result, kind = r.kind;
          padEl.appendChild(el('p', 'rmain k-' + kind, T('kind_' + kind)));
          var msg = CM.fillWord(r.reaction[app.i18n.lang], r.text);
          if (kind === 'fail' && P.prob.failAfter) msg += P.prob.failAfter[app.i18n.lang];
          padEl.appendChild(el('p', 'rmsg big', msg));
          if (kind === 'success' || kind === 'funny') padEl.appendChild(btn(T('next'), 'big', function () { app.sfx.play('ui'); nextProblem(); }));
          else padEl.appendChild(btn(T('retryBtn'), 'big', function () { app.sfx.play('ui'); retry(); }));
        } else {
          padEl.appendChild(el('p', 'prompt', P.prob.text[app.i18n.lang]));
          addWriteRow(P.busy || st === 'dying');
          if (P.msg) padEl.appendChild(el('p', 'rmsg k-' + P.msgKind, P.msg));
        }
      } else if (st === 'clear') {
        padEl.appendChild(el('p', 'rmain k-success', T('clearTitle') + '　' + T('chalkPlus')));
        padEl.appendChild(el('p', 'rmsg big', T(run.route === 'sky' ? 'route_sky' : 'route_under')));
        padEl.appendChild(el('p', 'note', T('funnyCount', { n: run.funny }) + '　' + T('toBeContinued')));
        padEl.appendChild(btn(T('restart'), 'big', function () { app.sfx.play('ui'); newGame(); }));
        padEl.appendChild(btn(T('toTitle'), 'small', function () { app.sfx.play('ui'); toTitle(); }));
      } else if (st === 'over') {
        padEl.appendChild(el('p', 'rmain k-fail', T('gameOver')));
        padEl.appendChild(el('p', 'rmsg big', T('end8')));
        padEl.appendChild(btn(T('restart'), 'big', function () { app.sfx.play('ui'); newGame(); }));
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
        var m = /[?&]q=(\d+)/.exec(global.location.search);
        if (m && !run) {
          run = { chapter: 1, q: 0, funny: 0, lastFunny: null, route: null, words: 0 };
          meter.set(CFG.CHALK_START);
          goProblem(U.clamp(parseInt(m[1], 10) - 1, 0, chapterProblems(1).length - 1));
        }
      },
      relayout: function () {
        // 入力を待っている間なら、新しい大きさで黒板を並べ直す
        if (P.D && (P.state === 'input' || P.state === 'title' || P.state === 'prologue') && !P.busy && !P.trans) setScene(P.sceneId, P.prob);
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
        if (!D) return;
        D.time += dt;
        var S = CM.SCENES[P.sceneId];
        if (S.update) S.update(D.sc, dt, D);
        updateWriting(dt);
        if (D.intro) { stepThread(D.intro, dt); if (D.intro.done) D.intro = null; }
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
        if (P.prob && run && P.state !== 'prologue') {
          CM.chalk.text(ctx, (run.q + 1) + '. ' + P.prob.title[app.i18n.lang], st.x + 14, st.y + 22, { size: 18, align: 'left', color: COL.yellow, maxW: st.w - 170 });
          drawMap(ctx, st, run.q);
        }
        // 結果のはんこ
        if (P.stamp) {
          var ks = U.easeBack(U.clamp(P.stamp.t / 0.35, 0, 1));
          var sz = Math.min(44, st.w / 9);
          ctx.save();
          ctx.translate(st.x + st.w / 2, st.y + st.h * (P.state === 'clear' ? 0.3 : 0.45));
          ctx.rotate(-0.08);
          ctx.scale(ks, ks);
          CM.chalk.text(ctx, T(P.stamp.key), 0, 0, { size: sz, color: P.stamp.color, maxW: st.w * 0.9 });
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
    function stageChalk(ctx, D, sceneId) {
      var S = CM.SCENES[sceneId], st = D.st;
      if (S.drawChalk) S.drawChalk(ctx, D.sc, D);
      D.chalkHooks.forEach(function (h) { h(ctx, D.time); });
      D.copies.forEach(function (c) { c.draw(ctx); });
      // 棒人間（と、手に持った文字）
      D.actors.forEach(function (a) {
        if (!a.frame) return;
        var j = CM.drawMan(ctx, a.frame.pose, D.s, D.time, { color: a.color });
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
        w.x = j.head[0] + f * 16 * s; w.y = j.head[1] + 10 * s; w.rot = D.heldRot * f;
      } else if (D.held === 'dig') {
        w.x = j.handF[0] + f * 10 * s; w.y = j.handF[1] + 12 * s; w.rot = f * 1.1;
      } else {
        w.x = j.handF[0] + f * 8 * s; w.y = j.handF[1] - 6 * s + (D.held === 'toss' ? D.tossY : 0);
        w.rot = D.held === 'toss' ? D.tossY * 0.05 : 0;
      }
    }

    return api;
  };
})(window);
