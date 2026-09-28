/*
 * 判定まわりのファイルを、ブラウザなしで読み込む（check-dict.js と test-judge.js で使う）
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

module.exports = function loadJudge() {
  const root = path.join(__dirname, '..');
  const ctx = { console, Intl };
  ctx.window = ctx;
  vm.createContext(ctx);
  ['js/game/config.js', 'js/game/util.js', 'js/data/dictionary.js', 'js/data/reactions.js', 'js/data/ngwords.js', 'js/game/judge.js']
    .forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
  return ctx.CM;
};
