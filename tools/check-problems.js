#!/usr/bin/env node
/*
 * 問題データを調べる
 *   node tools/check-problems.js
 * ・成功条件 2〜6個、珍回答 1〜2個 か（試遊で「正解をもっと増やす」ことにした）
 * ・文章が日本語と英語の両方あるか、演出（act）と黒板の様子（scene）が本当にあるか
 * ・どの条件にも、当てはまる単語が辞書にあるか（ないと、その条件は一生出ない）→ 例の単語を表示
 */
'use strict';
const fs = require('fs');
const path = require('path');
const CM = require('./load-judge')();
const root = path.join(__dirname, '..');
// 演出と黒板の様子は、章ごとにファイルが分かれている（acts.js・acts-ch2.js など）
const read = re => fs.readdirSync(path.join(root, 'js/game')).filter(f => re.test(f)).map(f => fs.readFileSync(path.join(root, 'js/game', f), 'utf8')).join('\n');
const acts = new Set([...read(/^acts.*\.js$/).matchAll(/\bA\.(\w+)\s*=/g)].map(m => m[1]));
const scenesSrc = read(/^scenes.*\.js$/);
const scenes = new Set([...scenesSrc.matchAll(/^    (\w+): \{$/gm), ...scenesSrc.matchAll(/^  SC\.(\w+) = \{$/gm)].map(m => m[1]));
let bad = 0;
function ng(msg) { bad++; console.log('  ✗ ' + msg); }

// 共通反応・特別な単語の演出もあるか
Object.keys(CM.COMMON_REACTIONS).forEach(c => {
  const r = CM.COMMON_REACTIONS[c];
  [r].concat(Object.values(r.subs || {})).forEach(x => [x].concat(x.alts || []).forEach(y => {
    if (!acts.has(y.act)) ng('共通反応 ' + c + ' の演出「' + y.act + '」がありません');
    if (!y.ja || !y.en) ng('共通反応 ' + c + ' の文章がありません');
  }));
});
CM.SPECIAL_WORDS.forEach(sp => { if (!acts.has(sp.act)) ng('特別な単語 ' + sp.id + ' の演出「' + sp.act + '」がありません'); });

CM.PROBLEMS.forEach((p, i) => {
  console.log((i + 1) + '. ' + p.title.ja + '（' + p.id + '）');
  const succ = p.rules.filter(r => r.result === 'success').length, fun = p.rules.filter(r => r.result === 'funny').length;
  if (!p.last && (succ < 2 || succ > 6)) ng('成功条件が ' + succ + ' 個（2〜6個にする）');
  if (!p.last && (fun < 1 || fun > 2)) ng('珍回答が ' + fun + ' 個（1〜2個にする）');
  ['title', 'text'].forEach(k => { if (!p[k] || !p[k].ja || !p[k].en) ng(k + ' の日本語か英語がありません'); });
  if (!scenes.has(p.scene)) ng('黒板の様子「' + p.scene + '」がありません');
  if (p.failAfter && (!acts.has(p.failAfter.act) || !p.failAfter.ja || !p.failAfter.en)) ng('failAfter の演出か文章がありません');
  p.rules.forEach(r => {
    const cond = (r.first ? '先に ' : '') + (r.tag ? 'タグ ' + r.tag : r.sub ? '小分類 ' + r.sub : r.cat ? '大分類 ' + r.cat : r.any ? 'どんな単語でも' : '単語 ' + r.word);
    if (!r.ja || !r.en) ng(cond + '：文章の日本語か英語がありません');
    if (!acts.has(r.act)) ng(cond + '：演出「' + r.act + '」がありません');
    Object.keys(r.variants || {}).forEach(v => { if (!acts.has(r.variants[v].act)) ng(cond + '：' + v + ' の演出「' + r.variants[v].act + '」がありません'); });
    // この条件で決まる単語を辞書から探す
    const hit = CM.DICT_ENTRIES.find(e => { const w = e.ja[0] || e.en[0]; const j = CM.judgeWord(w, p); return j.rule === r; });
    if (!hit) ng(cond + '：この条件で決まる単語が辞書にありません');
    else console.log('   ' + ({ success: '成功', funny: '珍回答', fail: '失敗' }[r.result] || r.result) + '　' + cond.padEnd(14) + ' 例：' + (hit.ja[0] || hit.en[0]) + ' → ' + r.act);
  });
});
console.log(bad ? '\n' + bad + ' 件 直すところがあります' : '\n問題データ：全部OK');
process.exitCode = bad ? 1 : 0;
