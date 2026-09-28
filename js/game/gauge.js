/*
 * CHALK MAN チョーク残量（体力）
 * 画面の隅のチョーク置きにある、本物のチョークの長さが体力。
 * 開始 100。失敗 −20、章クリア +20（上限 100）。0 になると黒板消しに消されてゲームオーバー。
 *
 *   var chalk = CM.createChalkMeter();
 *   chalk.add(-20);            // 減らす（戻り値：0 になったら true）
 *   chalk.onChange = function (value, delta) {};
 */
(function (global) {
  'use strict';
  var CM = global.CM = global.CM || {};
  var U = CM.util, CFG = CM.CFG;

  CM.createChalkMeter = function () {
    var api = {
      value: CFG.CHALK_START,
      shown: CFG.CHALK_START,   // 表示している長さ（なめらかに追いかける）
      flash: 0,                 // 増えたときの光
      snap: 0,                  // 折れたときのゆれ
      onChange: null,
      set: function (v) {
        api.value = U.clamp(v, 0, CFG.CHALK_MAX);
        api.shown = api.value;
      },
      add: function (d) {
        var before = api.value;
        api.value = U.clamp(api.value + d, 0, CFG.CHALK_MAX);
        var real = api.value - before;
        if (real < 0) api.snap = 1;
        if (real > 0) api.flash = 1;
        if (api.onChange) api.onChange(api.value, real);
        return api.value <= 0;
      },
      get empty() { return api.value <= 0; },
      update: function (dt) {
        api.shown += (api.value - api.shown) * Math.min(1, dt * 6);
        api.flash = Math.max(0, api.flash - dt * 1.5);
        api.snap = Math.max(0, api.snap - dt * 3);
      },
      /** 折れた先の位置（かけらを飛ばすのに使う） */
      tipPos: function (L) {
        var g = L.gauge, len = g.len * api.value / CFG.CHALK_MAX;
        return g.align === 'right' ? [g.x + g.len - len, g.y] : [g.x + len, g.y];
      },
      /** チョーク置きの上に描く */
      draw: function (ctx, L, time) {
        var g = L.gauge;
        var len = g.len * api.shown / CFG.CHALK_MAX;
        var th = Math.min(9, Math.max(6, L.tray.h * 0.45));
        var y = g.y - (L.keyboard ? 0 : 1);
        var jx = api.snap ? Math.sin(time * 60) * 2 * api.snap : 0;
        var x0 = g.align === 'right' ? g.x + g.len - len : g.x;
        ctx.save();
        ctx.translate(jx, 0);
        // 数字（チョークの横に小さく）
        ctx.font = '400 ' + Math.round(Math.max(12, th * 1.6)) + 'px ' + CM.FONT;
        ctx.textBaseline = 'middle';
        ctx.fillStyle = api.value <= 20 ? '#ffb3a3' : 'rgba(255,248,230,0.9)';
        var label = String(Math.round(api.value));
        if (g.align === 'right') { ctx.textAlign = 'right'; ctx.fillText(label, g.x + g.len - Math.max(len, 0) - 8, y); }
        else { ctx.textAlign = 'left'; ctx.fillText(label, g.x + Math.max(len, 0) + 8, y); }
        if (len > 0.5) {
          // かげ
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(x0 + 1.5, y - th / 2 + 2, len, th);
          // 本体（白いチョーク）
          var gr = ctx.createLinearGradient(0, y - th / 2, 0, y + th / 2);
          gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.55, '#f1efe6'); gr.addColorStop(1, '#cfccc0');
          ctx.fillStyle = gr;
          ctx.fillRect(x0, y - th / 2, len, th);
          // 使ったほうの先は丸くすり減っている／折れた側はギザギザ
          var tipX = g.align === 'right' ? x0 : x0 + len;
          var d = g.align === 'right' ? -1 : 1;
          ctx.fillStyle = '#e9e6dc';
          ctx.beginPath();
          ctx.moveTo(tipX, y - th / 2);
          ctx.lineTo(tipX + d * 2, y - th / 4);
          ctx.lineTo(tipX + d * 0.5, y);
          ctx.lineTo(tipX + d * 2.5, y + th / 4);
          ctx.lineTo(tipX, y + th / 2);
          ctx.closePath(); ctx.fill();
          // 増えたときの光
          if (api.flash > 0) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = api.flash * 0.6;
            ctx.fillStyle = '#fff4b0';
            ctx.fillRect(x0 - 3, y - th / 2 - 3, len + 6, th + 6);
          }
        }
        ctx.restore();
      }
    };
    return api;
  };
})(window);
