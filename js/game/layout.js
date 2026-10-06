/*
 * CHALK MAN 画面の配置
 * スマホ縦：上半分が「棒人間の場所（ステージ）」、下半分が「書く欄（パッド）」
 * PC横　　：左が棒人間の場所、右が書く欄
 * キーボードが開いて見える高さが減ったときは、書く欄を小さくして棒人間の場所を守る。
 */
(function (global) {
  'use strict';
  var CM = global.CM = global.CM || {};
  var CFG = CM.CFG;

  /**
   * W, H：見えている画面の大きさ（CSS px）
   * safe：画面の切り欠き { top, right, bottom, left }
   * opts：{ portrait: 縦画面として並べるか, keyboard: キーボードが開いているか }
   */
  CM.computeLayout = function (W, H, safe, opts) {
    var F = CFG.FRAME, T = CFG.TRAY;
    var portrait = opts.portrait, keyboard = opts.keyboard;
    // キーボードが開いている間は下のふちを細くする（キーボードの上に最低限のふちだけ）
    var bottom = keyboard ? F * 0.6 : T + Math.max(0, safe.bottom);
    var board = {
      x: F + safe.left,
      y: F * (keyboard ? 0.6 : 1) + safe.top,
      w: W - F * 2 - safe.left - safe.right,
      h: H - F * (keyboard ? 0.6 : 1) - safe.top - bottom
    };
    var stage, pad, divider, gap = 6;
    if (portrait) {
      var ratio = keyboard ? CFG.KEYBOARD_STAGE : CFG.PORTRAIT_STAGE;
      var sh = Math.round(board.h * ratio);
      // 書く欄が狭くなりすぎないように
      var minPad = keyboard ? 118 : 250;
      if (board.h - sh < minPad) sh = Math.max(Math.round(board.h * 0.4), board.h - minPad);
      stage = { x: board.x, y: board.y, w: board.w, h: sh };
      pad = { x: board.x, y: board.y + sh, w: board.w, h: board.h - sh };
      divider = { x0: board.x + 12, y0: board.y + sh, x1: board.x + board.w - 12, y1: board.y + sh };
    } else {
      var sw = Math.round(board.w * CFG.LANDSCAPE_STAGE);
      if (board.w - sw < 300) sw = board.w - 300;
      stage = { x: board.x, y: board.y, w: sw, h: board.h };
      pad = { x: board.x + sw, y: board.y, w: board.w - sw, h: board.h };
      divider = { x0: board.x + sw, y0: board.y + 12, x1: board.x + sw, y1: board.y + board.h - 12 };
    }
    // 下の枠（チョーク置き）
    var tray = { x: 0, y: board.y + board.h + 3, w: W, h: Math.max(8, H - (board.y + board.h) - 3) };
    // チョーク（体力）の置き場所：縦は右下、横は左下（棒人間の側）
    var gaugeLen = Math.min(130, board.w * (portrait ? 0.3 : 0.16));
    var gauge = portrait
      ? { x: board.x + board.w - 18 - gaugeLen, y: tray.y + Math.min(tray.h, T) * 0.5, len: gaugeLen, align: 'right' }
      : { x: board.x + 18, y: tray.y + Math.min(tray.h, T) * 0.5, len: gaugeLen, align: 'left' };
    // 棒人間の大きさ（全身の高さ 約94 の何倍か）
    var figH = Math.min(stage.h * 0.4, stage.w * 0.36, 160);
    return {
      W: W, H: H, portrait: portrait, keyboard: keyboard,
      board: board, stage: stage, pad: pad, divider: divider, tray: tray, gauge: gauge,
      gap: gap,
      s: figH / 94,
      groundY: stage.y + stage.h * 0.8
    };
  };
})(window);
