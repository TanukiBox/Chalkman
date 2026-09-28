#!/usr/bin/env node
/*
 * 辞書を調べる：小分類ごとの単語の数、書き方のかぶり、タグの書き間違い
 *   node tools/check-dict.js
 */
'use strict';
const CM = require('./load-judge')();

const S = CM.DICT_STATS, SUBS = CM.DICT_SUBS, CATS = CM.DICT_CATS;
let short = 0;
console.log('小分類ごとの単語の数（日本語 / 英語）');
Object.keys(CATS).forEach(cat => {
  console.log('■ ' + CATS[cat].ja);
  Object.keys(SUBS).filter(s => SUBS[s].cat === cat).forEach(sub => {
    const st = S.subs[sub];
    const warn = st.ja < 20 || st.en < 20 ? '  ← 20語より少ない' : '';
    if (warn) short++;
    console.log('   ' + (SUBS[sub].ja + '　　　　　　').slice(0, 7) + ' 日本語 ' + String(st.ja).padStart(3) + ' / 英語 ' + String(st.en).padStart(3) + warn);
  });
});
console.log('');
console.log('合計：日本語 ' + S.ja + ' 語・英語 ' + S.en + ' 語 ＝ ' + (S.ja + S.en) + ' 語（ひらがな・漢字などの書き方は全部で ' + S.spellings + ' 通り）');
console.log('');
if (CM.DICT_PROBLEMS.length) {
  console.log('気をつけること（' + CM.DICT_PROBLEMS.length + ' 件）');
  CM.DICT_PROBLEMS.forEach(p => console.log('  ・' + p));
} else {
  console.log('かぶり・タグの書き間違いはありません。');
}
// 辞書の言葉が NG ワードに引っかかっていないか
const ngHits = [];
CM.DICT_ENTRIES.forEach(e => e.ja.concat(e.en).forEach(w => { if (CM.isNG(w)) ngHits.push(w); }));
if (ngHits.length) console.log('NGワードに引っかかる辞書の言葉：' + ngHits.join('、'));
process.exitCode = short || ngHits.length ? 1 : 0;
