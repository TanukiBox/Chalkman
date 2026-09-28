/*
 * CHALK MAN 確認用の画面（WBS 1. 画面と演出）
 * ・棒人間タブ：11種類の動きを1つずつ／順番に再生
 * ・文字タブ　：単語を書くとチョークで書かれて「物」になる。15種類のタグの動きを1つずつ／順番に
 * ・チョークタブ：チョーク残量の 減る・増える・0 になる を試す
 */
(function (global) {
  'use strict';
  var CM = global.CM = global.CM || {};
  var U = CM.util, COL = CM.COL, CFG = CM.CFG, PI = Math.PI;

  // 順番に再生するときの、1つあたりの長さ（秒）
  var MAN_SEC = { idle: 4, walk: 5, run: 4, jump: 3.2, climb: 4.8, fall: 2.2 * 2, swim: 5, swing: 1.5 * 3, cheer: 2.8, puzzled: 3, erased: 4 };
  var TAG_SEC = { heavy: 5.2, long: 4.6, big: 3.4, small: 3, edible: 4, hard: 2.3 * 2, soft: 2.2 * 2 };

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

  CM.createLab = function (app) {
    var T = function (k, p) { return app.i18n.t(k, p); };
    var padEl = document.getElementById('pad'), hudEl = document.getElementById('hud');
    var man = CM.createMan();
    var tagPlayer = CM.createTagPlayer();
    var meter = app.chalk;
    var S = {
      tab: 'man',
      manAuto: true, manIdx: 0, manT: 0,
      tagAuto: false, tagIdx: -1, tagT: 0,
      word: null, writer: null, phase: 'none', phaseT: 0, fly: null,
      over: false, overT: 0,
      time: 0
    };
    var ui = {}; // DOM の部品

    // ------------------------------------------------------------
    // 画面の部品（DOM）を作る
    // ------------------------------------------------------------
    function buildHud() {
      hudEl.innerHTML = '';
      hudEl.appendChild(btn(T('lang'), 'small', function () {
        app.i18n.setLang(app.i18n.lang === 'ja' ? 'en' : 'ja');
        document.documentElement.lang = app.i18n.lang;
        app.sfx.play('ui');
        buildHud(); buildPad();
        if (S.word && S.phase === 'onstage') { /* 書いた文字はそのまま（入力した文字を変えない） */ }
      }));
      ui.mute = btn(app.sound.muted ? T('mute') : T('sound'), 'small' + (app.sound.muted ? '' : ' on'), function () {
        app.sound.toggle();
        app.sfx.play('ui');
        buildHud();
      });
      hudEl.appendChild(ui.mute);
    }

    function buildPad() {
      padEl.innerHTML = '';
      var tabs = el('div', 'tabs');
      [['man', 'tabMan'], ['word', 'tabWord'], ['chalk', 'tabChalk']].forEach(function (d) {
        tabs.appendChild(btn(T(d[1]), S.tab === d[0] ? 'on' : '', function () { setTab(d[0]); }));
      });
      tabs.classList.add('kb-hide');
      padEl.appendChild(tabs);

      if (S.tab === 'man') {
        padEl.appendChild(el('p', 'note kb-hide', T('manNote')));
        var all = btn(T('playAll'), S.manAuto ? 'on' : '', function () {
          S.manAuto = !S.manAuto; S.manT = 0;
          if (S.manAuto) { S.manIdx = 0; man.play(CM.MAN_ORDER[0]); }
          app.sfx.play('ui'); buildPad();
        });
        padEl.appendChild(all);
        var grid = el('div', 'grid wide');
        ui.manBtns = {};
        CM.MAN_ORDER.forEach(function (k, i) {
          var b = btn(T('anim_' + k), man.name === k ? 'on' : '', function () {
            S.manAuto = false; S.manIdx = i; man.play(k); app.sfx.play('ui'); buildPad();
          });
          var num = el('span', 'num', String(i + 1));
          b.insertBefore(num, b.firstChild);
          ui.manBtns[k] = b;
          grid.appendChild(b);
        });
        padEl.appendChild(grid);
      } else if (S.tab === 'word') {
        padEl.appendChild(el('p', 'note kb-hide', T('wordNote')));
        ui.slate = el('div', 'slate');
        padEl.appendChild(ui.slate);
        var row = el('div', 'row');
        var input = el('input', 'cinput grow');
        input.type = 'text';
        input.placeholder = T('placeholder');
        input.maxLength = CFG.WORD_MAX * 2; // 12文字の判定は下で（絵文字などは2つ分に数えられるため）
        input.setAttribute('enterkeyhint', 'done');
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('autocorrect', 'off');
        input.setAttribute('autocapitalize', 'off');
        input.setAttribute('spellcheck', 'false');
        input.value = S.lastText || '';
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
        row.appendChild(btn(T('write'), '', submit));
        padEl.appendChild(row);
        var tg = el('div', 'grid kb-hide');
        tg.appendChild(btn(T('tagAll'), S.tagAuto ? 'on' : '', function () {
          S.tagAuto = !S.tagAuto; S.tagT = 0;
          if (S.tagAuto) { S.tagIdx = 0; tagPlayer.set(CM.TAG_ORDER[0]); }
          app.sfx.play('ui'); buildPad();
        }));
        tg.appendChild(btn(T('tagNone'), !S.tagAuto && S.tagIdx < 0 ? 'on' : '', function () {
          S.tagAuto = false; S.tagIdx = -1; tagPlayer.set(null); app.sfx.play('ui'); buildPad();
        }));
        ui.tagBtns = {};
        CM.TAG_ORDER.forEach(function (k, i) {
          var b = btn(T('tag_' + k), tagPlayer.key === k ? 'on' : '', function () {
            S.tagAuto = false; S.tagIdx = i; tagPlayer.set(k); app.sfx.play('ui'); buildPad();
          });
          ui.tagBtns[k] = b;
          tg.appendChild(b);
        });
        padEl.appendChild(tg);
      } else {
        padEl.appendChild(el('p', 'note', T('chalkNote')));
        var r2 = el('div', 'row');
        ui.failBtn = btn(T('fail'), 'red grow', function () { changeChalk(CFG.CHALK_FAIL); });
        ui.clearBtn = btn(T('clear'), 'blue grow', function () { changeChalk(CFG.CHALK_CLEAR); });
        ui.failBtn.disabled = S.over; ui.clearBtn.disabled = S.over;
        r2.appendChild(ui.failBtn); r2.appendChild(ui.clearBtn);
        padEl.appendChild(r2);
        padEl.appendChild(btn(T('reset'), '', function () {
          meter.set(CFG.CHALK_START); S.over = false; man.play('idle'); app.sfx.play('heal'); buildPad();
        }));
      }
      app.relayoutDom();
    }

    /** 再生中のボタンだけ光らせる（作り直さずに） */
    function markOn(map, key) {
      if (!map) return;
      Object.keys(map).forEach(function (k) { map[k].classList.toggle('on', k === key); });
    }

    function setTab(tab) {
      if (S.tab === tab) return;
      S.tab = tab;
      app.sfx.play('ui');
      if (tab === 'man') { S.manT = 0; man.play(S.manAuto ? CM.MAN_ORDER[S.manIdx] : CM.MAN_ORDER[S.manIdx]); }
      else if (tab === 'chalk') man.play(S.over ? 'erased' : 'idle');
      else man.play('idle');
      if (tab === 'word' && !S.word) startWriting(T('defaultWord'));
      buildPad();
    }

    // ------------------------------------------------------------
    // 文字を書く
    // ------------------------------------------------------------
    function submit() {
      var text = ui.input ? ui.input.value.trim() : '';
      if (!text) text = T('defaultWord');
      text = U.chars(text).slice(0, CFG.WORD_MAX).join('');
      S.lastText = ui.input ? ui.input.value : '';
      if (ui.input) ui.input.blur(); // キーボードを閉じて、棒人間の場所を広く見せる
      startWriting(text);
    }

    function slateRect() {
      var L = app.L;
      if (ui.slate && ui.slate.isConnected) {
        var r = ui.slate.getBoundingClientRect(), a = app.appRect();
        if (r.width > 10 && r.height > 10) return { x: r.left - a.left, y: r.top - a.top, w: r.width, h: r.height };
      }
      return { x: L.pad.x + 10, y: L.pad.y + 60, w: L.pad.w - 20, h: 70 };
    }

    function startWriting(text) {
      var w = CM.createWord(text, app.dpr);
      var sr = slateRect();
      var sc = Math.min((sr.w * 0.92) / w.width, (sr.h * 0.8) / w.height, 1.1);
      w.scale = sc;
      w.x = sr.x + sr.w / 2; w.y = sr.y + sr.h / 2;
      S.word = w;
      S.writer = CM.createWriter(w, { fx: app.fx, onTap: function (q) { app.sfx.play('tap', q); } });
      S.phase = 'writing'; S.phaseT = 0;
      if (!S.tagAuto && S.tagIdx < 0) tagPlayer.set(null);
      else tagPlayer.set(tagPlayer.key);
    }

    /** ステージでの文字の大きさ */
    function stageScale(w) {
      var st = app.L.stage;
      return Math.min((st.w * 0.46) / w.width, (st.h * 0.17) / w.height);
    }

    function stageEnv() {
      var L = app.L;
      return {
        stage: L.stage, groundY: L.groundY, s: L.s, fx: app.fx, sfx: app.sfx, T: T,
        // 文字が左右にはみ出さず、棒人間にも重ならずに広がれる幅（中心から片側）
        halfRoom: Math.min(L.stage.w * 0.38, L.stage.w * 0.42 - 28 * L.s) - 6,
        restX: L.stage.x + L.stage.w * 0.62, cx: L.stage.x + L.stage.w * 0.5
      };
    }

    function updateWord(dt) {
      var w = S.word;
      if (!w) return;
      S.phaseT += dt;
      if (S.phase === 'writing') {
        S.writer.update(dt);
        if (S.writer.done) { S.phase = 'wait'; S.phaseT = 0; }
      } else if (S.phase === 'wait') {
        if (S.phaseT > 0.35) {
          // 黒板からはがれて、ステージへ飛んでいく
          var env = stageEnv();
          var sc = stageScale(w);
          S.fly = { x0: w.x, y0: w.y, s0: w.scale, s1: sc, x1: env.restX, y1: env.groundY - w.height * sc / 2 - 3 };
          app.sfx.play('lift');
          app.fx.dust(w.x, w.y + w.dispH() * 0.3, 14, { w: w.dispW(), speed: 30, g: 200, life: 0.8 });
          S.phase = 'lift'; S.phaseT = 0;
        }
      } else if (S.phase === 'lift') {
        var f = S.fly, k = U.easeInOut(U.clamp(S.phaseT / 0.8, 0, 1));
        w.resetPose();
        w.scale = U.lerp(f.s0, f.s1, k);
        w.x = U.lerp(f.x0, f.x1, k);
        var arc = -Math.sin(k * PI) * Math.min(120, app.L.stage.h * 0.3);
        w.y = U.lerp(f.y0, f.y1, k) + arc;
        w.rot = Math.sin(k * PI * 2) * 0.12;
        if (S.phaseT >= 0.8) {
          S.phase = 'onstage'; S.phaseT = 0;
          app.sfx.play('land');
          app.fx.dust(w.x, app.L.groundY, 10, { angle: -PI / 2, spread: 2.6, speed: 60, g: 80 });
          tagPlayer.set(tagPlayer.key);
        }
      } else if (S.phase === 'onstage') {
        w.scale = stageScale(w);
        if (S.tagAuto) {
          S.tagT += dt;
          var key = CM.TAG_ORDER[S.tagIdx];
          if (S.tagT > (TAG_SEC[key] || 3.6)) {
            S.tagT = 0;
            S.tagIdx = (S.tagIdx + 1) % CM.TAG_ORDER.length;
            tagPlayer.set(CM.TAG_ORDER[S.tagIdx]);
            markOn(ui.tagBtns, CM.TAG_ORDER[S.tagIdx]);
          }
        }
        tagPlayer.update(w, dt, stageEnv());
      }
    }

    // ------------------------------------------------------------
    // チョーク残量
    // ------------------------------------------------------------
    function changeChalk(d) {
      if (S.over) return;
      var tip = meter.tipPos(app.L);
      var zero = meter.add(d);
      if (d < 0) {
        app.sfx.play('snap');
        // 折れたかけらが落ちる
        for (var i = 0; i < 3; i++) {
          app.realFx.add({ type: 'shard', x: tip[0], y: tip[1], vx: (Math.random() - 0.5) * 120, vy: -120 - Math.random() * 80, g: 700, life: 0.7,
            size: 2.5 + Math.random() * 2.5, vr: (Math.random() - 0.5) * 20, color: '#f4f2ea' });
        }
        app.realFx.dust(tip[0], tip[1], 8, { speed: 50, g: 120, life: 0.6 });
        man.play(zero ? 'erased' : 'puzzled');
        if (zero) { S.over = true; S.overT = 0; }
      } else {
        app.sfx.play('heal');
        man.play('cheer');
        for (var k = 0; k < 5; k++) app.realFx.add({ type: 'star', x: tip[0] + (Math.random() - 0.5) * 40, y: tip[1] - Math.random() * 16, life: 0.6, size: 5, color: COL.yellow });
      }
      buildPad();
    }

    // ------------------------------------------------------------
    // 毎フレーム
    // ------------------------------------------------------------
    var lastFrame = null;
    var api = {
      enter: function () {
        buildHud(); buildPad();
        man.play(CM.MAN_ORDER[0]);
      },
      /** 画面の大きさが変わったとき */
      relayout: function () {
        if (S.word && S.phase === 'writing') {
          // 書いている途中なら、書く場所に合わせ直す
          var sr = slateRect();
          S.word.x = sr.x + sr.w / 2; S.word.y = sr.y + sr.h / 2;
        }
      },
      update: function (dt) {
        S.time += dt;
        var env = stageEnv();
        // 棒人間の動き
        if (S.tab === 'man' && S.manAuto) {
          S.manT += dt;
          if (S.manT > MAN_SEC[CM.MAN_ORDER[S.manIdx]]) {
            S.manT = 0;
            S.manIdx = (S.manIdx + 1) % CM.MAN_ORDER.length;
            man.play(CM.MAN_ORDER[S.manIdx]);
            markOn(ui.manBtns, CM.MAN_ORDER[S.manIdx]);
          }
        }
        if (S.tab === 'word') { env.cx = env.stage.x + env.stage.w * 0.2; }
        if (S.tab === 'chalk' && !S.over && (man.name === 'cheer' || man.name === 'puzzled') && man.t > 2.6) man.play('idle');
        if (S.over) S.overT += dt;
        lastFrame = man.update(dt, env, function (id) { app.sfx.play(id); });
        // 黒板消しに消され終わったら、そこで止める（ゲームオーバー）
        if (S.over && man.name === 'erased' && man.t > 2.9) man.t = 2.9;
        if (S.tab === 'word') updateWord(dt);
        // 1.4 チョーク残量が0なら、どのタブでも「ゲームオーバー」
      },
      /** チョークで描くもの（あとで黒板のざらざらで削られる） */
      drawChalk: function (ctx) {
        var L = app.L, env = stageEnv(), s = L.s, st = L.stage, time = S.time;
        if (S.tab === 'word') env.cx = st.x + st.w * 0.2;
        var fr = lastFrame, ex = (fr && fr.extras) || {};
        // ステージの中だけに描く
        ctx.save();
        ctx.beginPath(); ctx.rect(st.x, st.y, st.w, st.h); ctx.clip();
        // 見出し
        var head = S.tab === 'man'
          ? (CM.MAN_ORDER.indexOf(man.name) + 1) + '/11  ' + T('anim_' + man.name)
          : S.tab === 'word'
            ? (tagPlayer.key ? (S.tagAuto ? (CM.TAG_ORDER.indexOf(tagPlayer.key) + 1) + '/15  ' : '') + T('tag_' + tagPlayer.key) : T('tagNone'))
            : T('chalkLeft', { n: Math.round(meter.value) });
        CM.chalk.text(ctx, head, st.x + 14, st.y + 22, { size: 20, align: 'left', color: COL.yellow, maxW: st.w - 130 });
        // 地面
        CM.props.ground(ctx, st, L.groundY, time, ex.pit);
        if (ex.shadow) CM.props.shadow(ctx, ex.shadow, s);
        if (ex.ladder) CM.props.ladder(ctx, ex.ladder, s, time);
        // 文字（ステージ上）
        var w = S.word;
        var wordOnStage = S.tab === 'word' && w && (S.phase === 'onstage');
        if (wordOnStage) tagPlayer.chalkBefore(ctx, w, env);
        // 棒人間
        if (fr) {
          var j = CM.drawMan(ctx, fr.pose, s, time);
          if (ex.eraseFrom !== undefined && ex.eraseFrom !== null) {
            // 黒板消しが通ったところを消す
            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = '#000';
            ctx.fillRect(ex.eraseFrom, ex.eraseBox.y0, st.x + st.w - ex.eraseFrom + 50, ex.eraseBox.y1 - ex.eraseBox.y0);
            ctx.restore();
          }
          if (ex.speedLines) CM.props.speedLines(ctx, j, s, time);
          if (ex.fallLines) CM.props.fallLines(ctx, j, s, time);
          if (ex.water) CM.props.water(ctx, st, ex.water, s);
          if (ex.question) CM.props.question(ctx, j, s, ex.question, time);
          if (ex.held) drawHeld(ctx, j, s, ex.trail);
          if (ex.sparkle && Math.random() < 0.25) {
            app.fx.add({ type: 'star', x: j.head[0] + (Math.random() - 0.5) * 90 * s, y: j.head[1] + (Math.random() - 0.3) * 60 * s, life: 0.5, size: (4 + Math.random() * 4) * s, color: Math.random() < 0.5 ? COL.yellow : COL.chalk });
          }
        }
        if (wordOnStage) { w.draw(ctx); tagPlayer.chalkAfter(ctx, w, env); }
        // ゲームオーバー
        if (S.over && S.overT > 2.4) {
          var k = U.easeBack(U.range(S.overT, 2.4, 2.9));
          ctx.save();
          ctx.translate(st.x + st.w / 2, st.y + st.h * 0.4);
          ctx.scale(k, k);
          CM.chalk.text(ctx, T('gameOver'), 0, 0, { size: Math.min(48, st.w / 8), color: COL.red, maxW: st.w * 0.9 });
          CM.chalk.text(ctx, T('end8'), 0, Math.min(48, st.w / 8) * 0.95, { size: Math.min(22, st.w / 18), color: COL.chalk, maxW: st.w * 0.9 });
          ctx.restore();
        }
        ctx.restore();
        // 書く欄：書く線と、書いている／飛んでいる文字（ステージの外にも描く）
        if (S.tab === 'word') {
          var sr = slateRect();
          CM.chalk.line(ctx, [sr.x + 6, sr.y + sr.h - 2, sr.x + sr.w - 6, sr.y + sr.h - 2], { w: 1.6, alpha: 0.3, seed: 5, wob: 0.6 });
          if (w && S.phase !== 'onstage') w.draw(ctx);
        }
      },
      /** かすれない物（光・暗がり・黒板消し・書いているチョーク） */
      drawReal: function (ctx) {
        var fr = lastFrame, ex = (fr && fr.extras) || {}, st = app.L.stage;
        var w = S.word;
        if (S.tab === 'word' && w && S.phase === 'onstage') tagPlayer.light(ctx, w, stageEnv());
        if (ex.smear) CM.props.realSmear(ctx, ex.smear, app.L.s);
        if (ex.eraser) {
          ctx.save();
          ctx.beginPath(); ctx.rect(app.L.board.x, app.L.board.y, app.L.board.w, app.L.board.h); ctx.clip();
          CM.props.realEraser(ctx, ex.eraser);
          ctx.restore();
        }
        if (S.tab === 'word' && S.writer && S.phase === 'writing') S.writer.drawTip(ctx);
      }
    };

    /** 棒人間が手に持つ文字（書いた単語。まだなければ「オノ」） */
    var heldWord = null, heldText = '';
    function drawHeld(ctx, j, s, trail) {
      var text = (S.word && S.word.text) || T('heldWord');
      if (!heldWord || heldText !== text) { heldWord = CM.createWord(text, app.dpr); heldText = text; }
      var hw = heldWord;
      hw.resetPose();
      var len = Math.min(80 * s, hw.width * (30 * s / hw.height));
      hw.scale = len / hw.width;
      var a = j.handAngleF, f = j.f;
      var dx = Math.sin(a) * f, dy = Math.cos(a);
      // 文字の左はしを手に持つ（持ち手）
      hw.x = j.handF[0] + dx * (len / 2 - 4 * s);
      hw.y = j.handF[1] + dy * (len / 2 - 4 * s);
      hw.rot = Math.atan2(dy, dx);
      CM.props.trail(ctx, j, s, trail, (CM.BODY.uarm + CM.BODY.farm) * s + len);
      hw.draw(ctx);
    }

    return api;
  };
})(window);
