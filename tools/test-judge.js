#!/usr/bin/env node
/*
 * 判定の自動テスト（2.2 表記ゆれ・2.3 判定の順番・2.4 NGワード）
 *   node tools/test-judge.js
 */
'use strict';
const CM = require('./load-judge')();

let ok = 0, ng = 0;
function check(name, cond, info) {
  if (cond) ok++; else { ng++; console.log('✗ ' + name + (info ? '  → ' + info : '')); }
}
function id(w) { const e = CM.lookupWord(w); return e ? e.id : null; }

// ---- 2.2 表記ゆれ ----
const axe = id('おの');
check('おの が辞書にある', !!axe);
['オノ', '斧', 'ｵﾉ', 'axe', 'AXE', 'Axe', 'axes', 'ＡＸＥ', 'ａｘｅｓ', ' axe ', 'おの！'].forEach(w => check('「' + w + '」＝おの', id(w) === axe, id(w)));
check('knives → knife', id('knives') === id('knife'));
check('cherries → cherry', id('cherries') === id('cherry'));
check('ICE CREAM ＝ ice cream ＝ icecream', id('ICE CREAM') === id('ice cream') && id('icecream') === id('ice cream'));
check('ドラゴン ＝ 竜 ＝ dragons', id('ドラゴン') === id('竜') && id('dragons') === id('竜'));
check('ヴァンパイア ＝ vampire', id('ヴァンパイア') === id('vampire'));
check('12文字まで', CM.judgeWord('あいうえおかきくけこさしすせそ').text === 'あいうえおかきくけこさし');

// ---- 2.3 判定の順番（崖の問題の例）----
const cliff = {
  rules: [
    { tag: 'fly', result: 'success' },
    { tag: 'long', result: 'success' },
    { sub: 'building', result: 'success' },
    { sub: 'bug', result: 'funny' }
  ]
};
const J = w => CM.judgeWord(w, cliff);
check('1. 特別な単語：黒板消し', J('黒板消し').level === 1 && J('黒板消し').kind === 'pinch');
check('1. 特別な単語：eraser', J('ERASER').level === 1);
check('2. タグ：ドラゴン（飛ぶ）→ 成功', J('ドラゴン').level === 2 && J('ドラゴン').kind === 'success' && J('ドラゴン').showTag === 'fly');
check('2. タグ：はしご（長い）→ 成功', J('はしご').level === 2 && J('はしご').showTag === 'long');
check('2. タグが小分類より先：ちょう（虫だけど飛ぶ）→ 成功', J('ちょうちょ').level === 2 && J('ちょうちょ').kind === 'success');
check('3. 小分類：いえ（建物）→ 成功', J('いえ').level === 3 && J('いえ').kind === 'success');
check('3. 小分類：アリ（虫）→ 珍回答', J('アリ').level === 3 && J('アリ').kind === 'funny');
check('4. 共通反応：オノ（武器）→ 失敗・空ぶり', J('オノ').level === 4 && J('オノ').kind === 'fail' && J('オノ').reaction.anim === 'swing' && J('オノ').chalk === -20);
check('4. 共通反応：りんご（食べ物）', J('りんご').level === 4 && J('りんご').reaction.by === 'cat');
check('5. 辞書にない：ほげほげ', J('ほげほげ').level === 5 && J('ほげほげ').kind === 'unknown' && J('ほげほげ').chalk === 0);
check('入力した文字をそのまま使う', J('オノ').text === 'オノ' && J('ＡＸＥ').text === 'ＡＸＥ');

// ---- 様子のことば（「おおきないわ」など）----
function tags(w) { const e = CM.lookupWord(w); return e ? e.tags : null; }
check('おおきないわ ＝ いわ', id('おおきないわ') === id('いわ') && tags('おおきないわ')[0] === 'big');
check('大きな岩 ＝ いわ', id('大きな岩') === id('いわ'));
check('ながいロープ：長い', id('ながいロープ') === id('ロープ') && tags('ながいロープ').indexOf('long') >= 0);
check('あついスープ：熱い', id('あついスープ') === id('スープ') && tags('あついスープ')[0] === 'hot');
check('つめたいスープ：熱いが消えて冷たい', tags('つめたいスープ')[0] === 'cold' && tags('つめたいスープ').indexOf('hot') < 0);
check('ちいさなドラゴン：大きいが消える', tags('ちいさなドラゴン').indexOf('big') < 0 && tags('ちいさなドラゴン')[0] === 'small');
check('ふわふわのくも', id('ふわふわのくも') === null || id('ふわふわのくも') === id('くも'));
check('big rock ＝ rock', id('big rock') === id('rock') && tags('big rock')[0] === 'big');
check('long ropes ＝ rope', id('long ropes') === id('rope'));
check('2つ重ね：おおきなあついいわ', id('おおきなあついいわ') === id('いわ') && tags('おおきなあついいわ').slice(0, 2).join() === 'big,hot');
check('辞書にある単語はそのまま：ホットドッグ', !CM.lookupWord('ホットドッグ') || !CM.lookupWord('ホットドッグ').mods);
check('のこりが辞書にない：おおきなほげ', id('おおきなほげ') === null);
check('ことばだけ：おおきな', id('おおきな') === null);
check('様子で判定が変わる：ながいひも → 崖の問題で成功', J('ながいひも').kind === 'success' && J('ながいひも').showTag === 'long');
check('様子のことば＋決まった単語', CM.judgeWord('ながいロープ', { rules: [{ word: 'ロープ', result: 'funny' }] }).kind === 'funny');

// ---- 2.4 NGワード ----
['ばか', 'バカ', 'ＢＡＫＡ'.toLowerCase() === 'baka' ? 'idiot' : 'idiot', 'IDIOT', 'idiots', 'Fuck you', 'しね', 'シネ', '死ねよ'].forEach(w => check('NG：' + w, CM.isNG(w) && J(w).kind === 'ng'));
['ばかり', 'シネマ', 'grape', 'grapes', 'class', 'glass', 'scunthorpe', 'はしご', 'えだ', 'assist'].forEach(w => check('NGではない：' + w, !CM.isNG(w)));
check('NG は特別な単語より先', J('死ね').level === 0);

console.log('テスト：' + ok + ' 件 OK' + (ng ? '、' + ng + ' 件 だめ' : '（全部OK）'));
process.exitCode = ng ? 1 : 0;
