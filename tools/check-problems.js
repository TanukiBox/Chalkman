#!/usr/bin/env node
/*
 * 問題データを調べる
 *   node tools/check-problems.js
 * ・成功条件 2〜4個、珍回答 1〜2個 か
 * ・文章が日本語と英語の両方あるか、演出（act）と黒板の様子（scene）が本当にあるか
 * ・どの条件にも、当てはまる単語が辞書にあるか（ないと、その条件は一生出ない）→ 例の単語を表示
 */
'use strict';
const fs = require('fs');
const path = require('path');
const CM = require('./load-judge')();
const root = path.join(__dirname, '..');
const acts = new Set([...fs.readFileSync(path.join(root, 'js/game/acts.js'), 'utf8').matchAll(/\bA\.(\w+)\s*=/g)].map(m => m[1]));
const scenes = new Set([...fs.readFileSync(path.join(root, 'js/game/scenes.js'), 'utf8').matchAll(/^    (\w+): \{$/gm)].map(m => m[1]));
let bad = 0;
function ng(msg) { bad++; console.log('  ✗ ' + msg); }

// 共通反応・特別な単語の演出もあるか
Object.keys(CM.COMMON_REACTIONS).forEach(c => {
  const r = CM.COMMON_REACTIONS[c];
  [r].concat(Object.values(r.subs || {})).forEach(x => { if (!acts.has(x.act)) ng('共通反応 ' + c + ' の演出「' + x.act + '」がありません'); });
});
CM.SPECIAL_WORDS.forEach(sp => { if (!acts.has(sp.act)) ng('特別な単語 ' + sp.id + ' の演出「' + sp.act + '」がありません'); });

CM.PROBLEMS.forEach((p, i) => {
  console.log((i + 1) + '. ' + p.title.ja + '（' + p.id + '）');
  const succ = p.rules.filter(r => r.result === 'success').length, fun = p.rules.filter(r => r.result === 'funny').length;
  if (succ < 2 || succ > 4) ng('成功条件が ' + succ + ' 個（2〜4個にする）');
  if (fun < 1 || fun > 2) ng('珍回答が ' + fun + ' 個（1〜2個にする）');
  ['title', 'text'].forEach(k => { if (!p[k] || !p[k].ja || !p[k].en) ng(k + ' の日本語か英語がありません'); });
  if (!scenes.has(p.scene)) ng('黒板の様子「' + p.scene + '」がありません');
  if (p.failAfter && (!acts.has(p.failAfter.act) || !p.failAfter.ja || !p.failAfter.en)) ng('failAfter の演出か文章がありません');
  p.rules.forEach(r => {
    const cond = r.tag ? 'タグ ' + r.tag : r.sub ? '小分類 ' + r.sub : r.cat ? '大分類 ' + r.cat : '単語 ' + r.word;
    if (!r.ja || !r.en) ng(cond + '：文章の日本語か英語がありません');
    if (!acts.has(r.act)) ng(cond + '：演出「' + r.act + '」がありません');
    Object.keys(r.variants || {}).forEach(v => { if (!acts.has(r.variants[v].act)) ng(cond + '：' + v + ' の演出「' + r.variants[v].act + '」がありません'); });
    // この条件で決まる単語を辞書から探す
    const hit = CM.DICT_ENTRIES.find(e => { const w = e.ja[0] || e.en[0]; const j = CM.judgeWord(w, p); return j.rule === r; });
    if (!hit) ng(cond + '：この条件で決まる単語が辞書にありません');
    else console.log('   ' + (r.result === 'success' ? '成功' : '珍回答') + '　' + cond.padEnd(14) + ' 例：' + (hit.ja[0] || hit.en[0]) + ' → ' + r.act);
  });
});
console.log(bad ? '\n' + bad + ' 件 直すところがあります' : '\n問題データ：全部OK');
process.exitCode = bad ? 1 : 0;
