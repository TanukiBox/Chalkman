/*
 * CHALK MAN 調整用の数値と色
 * 見た目や手ざわりを変えたくなったら、まずここの数字を触る。
 */
(function (global) {
  'use strict';
  var CM = global.CM = global.CM || {};

  CM.CFG = {
    // ---- チョーク残量（体力）----
    CHALK_MAX: 100,
    CHALK_START: 100,
    CHALK_FAIL: -20,          // 失敗したとき
    CHALK_CLEAR: 20,          // 章をクリアしたとき

    // ---- 入力 ----
    WORD_MAX: 12,             // 書ける文字数

    // ---- 画面 ----
    FRAME: 14,                // 木の枠の太さ（px）
    TRAY: 22,                 // 下の枠（チョーク置き）の太さ（px）
    PORTRAIT_STAGE: 0.5,      // スマホ縦：上の「棒人間の場所」が画面の何割か
    LANDSCAPE_STAGE: 0.58,    // PC横：左の「棒人間の場所」が画面の何割か
    KEYBOARD_STAGE: 0.56,     // キーボードが開いて画面が狭いとき、棒人間の場所の割合
    MAX_DPR: 2,               // 画面のきめ細かさの上限（重くならないように）

    // ---- 文字を書く演出 ----
    WRITE_CHAR_SEC: 0.2,      // 1文字を書く時間（秒）
    WRITE_GAP_SEC: 0.06,      // 文字と文字の間
    WRITE_TAPS: 2             // 1文字につき何回「カツ」と鳴らすか
  };

  // ---- チョークの色 ----
  CM.COL = {
    board: '#23402f',         // 黒板の深緑
    boardDark: '#172b20',
    boardLight: '#2f5540',
    chalk: '#f4f2ea',         // 白いチョーク
    yellow: '#ffe27a',
    pink: '#ffb3c7',
    red: '#ff8f7a',
    blue: '#a9dcff',
    ice: '#dff4ff',
    green: '#b8f0a0',
    orange: '#ffbf6e',
    purple: '#d7b8ff',
    wood: '#9b6a3c',
    woodDark: '#6e4726',
    woodLight: '#c08a54'
  };

  CM.FONT = '"Yomogi", "Hiragino Maru Gothic ProN", "Yu Gothic", "Comic Sans MS", sans-serif';
})(window);
