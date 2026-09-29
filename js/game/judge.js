/*
 * CHALK MAN 単語の判定
 *
 * ■ 表記ゆれ（2.2）：調べる前に、書き方をそろえる
 *   ・全角／半角をそろえる（ＡＸＥ → axe、ｵﾉ → オノ）
 *   ・英語は小文字に（AXE → axe）、複数形は元の形でも調べる（axes → axe、knives → knife）
 *   ・カタカナはひらがなに（オノ → おの）。漢字は辞書に書いた書き方で調べる（斧）
 *   ・スペース・記号（！？・ など）は無視する。のばす音「ー」は残す
 *   ・12文字まで
 *
 * ■ 判定の順番（2.3）：上から順に当てはめて、最初に当てはまったもので決まる
 *   0. NGワード          → 黒板消しで消して「書き直してね」（チョークは減らない）
 *   1. 特別な単語        → 隠し反応（問題ごとの特別な単語 → どの問題でも使う特別な単語）
 *   2. 問題の「タグ」の条件 → 成功 / 珍回答
 *   3. 問題の「小分類・大分類・単語」の条件 → 成功 / 珍回答
 *   4. 大分類ごとの共通反応 → 失敗（チョーク −20）
 *   5. 辞書にない単語    → 首をかしげて文字が崩れる。チョークは減らさず書き直し
 *
 * 結果の kind：ng / special(pinch・retry) / success / funny / fail / unknown
 */
(function (global) {
  'use strict';
  var CM = global.CM = global.CM || {};

  var WORD_MAX = (CM.CFG && CM.CFG.WORD_MAX) || 12;
  var CHALK_FAIL = (CM.CFG && CM.CFG.CHALK_FAIL) || -20;

  // 辞書に書くタグ（日本語）→ プログラムの中の名前
  var TAG_JA = {
    '飛ぶ': 'fly', '泳ぐ': 'swim', '熱い': 'hot', '冷たい': 'cold', '重い': 'heavy',
    '大きい': 'big', '小さい': 'small', '長い': 'long', '硬い': 'hard', '柔らかい': 'soft',
    '光る': 'glow', '音が出る': 'sound', '食べられる': 'edible', '危ない': 'danger', 'かわいい': 'cute'
  };
  CM.TAG_JA = TAG_JA;

  // 英語の、形が変わる複数形
  var IRREGULAR = {
    mice: 'mouse', geese: 'goose', teeth: 'tooth', feet: 'foot', children: 'child', men: 'man', women: 'woman',
    oxen: 'ox', knives: 'knife', leaves: 'leaf', wolves: 'wolf', lives: 'life', cacti: 'cactus', octopi: 'octopus',
    fungi: 'fungus', loaves: 'loaf', shelves: 'shelf', halves: 'half', thieves: 'thief', elves: 'elf', dwarves: 'dwarf',
    potatoes: 'potato', tomatoes: 'tomato', heroes: 'hero', volcanoes: 'volcano', mosquitoes: 'mosquito'
  };

  function chars(s) {
    return CM.util && CM.util.chars ? CM.util.chars(s) : Array.from(String(s));
  }

  /** 書き方をそろえる（調べるための形。画面には出さない） */
  function normalize(s) {
    s = String(s || '');
    try { s = s.normalize('NFKC'); } catch (e) { /* 古いブラウザ */ }
    s = s.toLowerCase();
    // カタカナ → ひらがな（ヴ も ゔ に）
    s = s.replace(/[ァ-ヶ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x60); });
    // スペース・記号を取る（のばす音「ー」は残す）
    s = s.replace(/[\s_\-‐-―・･.,!?'"`~〜、。「」『』()[\]{}☆★♡♥♪…:;*#&+=\/\\|<>^@%$]/g, '');
    return s;
  }
  CM.normalizeWord = normalize;

  /** 調べる候補（そのまま → 英語の複数形を元に戻した形） */
  function candidates(key) {
    var out = [key];
    if (!/^[a-z]+$/.test(key) || key.length < 3) return out;
    if (IRREGULAR[key]) out.push(IRREGULAR[key]);
    if (/ies$/.test(key)) out.push(key.slice(0, -3) + 'y');
    if (/ves$/.test(key)) { out.push(key.slice(0, -3) + 'f'); out.push(key.slice(0, -3) + 'fe'); }
    if (/es$/.test(key)) out.push(key.slice(0, -2));
    if (/s$/.test(key) && !/ss$/.test(key)) out.push(key.slice(0, -1));
    return out;
  }
  CM.wordCandidates = candidates;

  function splitSpellings(s) {
    return String(s || '').split('/').map(function (x) { return x.trim(); }).filter(Boolean);
  }

  // ------------------------------------------------------------
  // 辞書を引けるように並べ直す（読み込んだときに1回）
  // ------------------------------------------------------------
  var index = {}, entries = [], problems = [], stats = { subs: {}, ja: 0, en: 0, spellings: 0 };
  (function build() {
    var D = CM.DICT || {}, SUBS = CM.DICT_SUBS || {};
    Object.keys(SUBS).forEach(function (sub) {
      var list = D[sub] || [];
      var st = stats.subs[sub] = { ja: 0, en: 0 };
      if (!D[sub]) problems.push('小分類「' + sub + '」の単語がありません');
      list.forEach(function (row, i) {
        var ja = splitSpellings(row[0]), en = splitSpellings(row[1]);
        var tags = [];
        String(row[2] || '').split(/[\s　]+/).filter(Boolean).forEach(function (t) {
          if (TAG_JA[t]) tags.push(TAG_JA[t]);
          else problems.push(SUBS[sub].ja + '「' + (ja[0] || en[0]) + '」のタグ「' + t + '」は15個のタグにありません');
        });
        var e = { id: sub + ':' + i, sub: sub, cat: SUBS[sub].cat, ja: ja, en: en, tags: tags };
        entries.push(e);
        if (ja.length) { st.ja++; stats.ja++; }
        if (en.length) { st.en++; stats.en++; }
        ja.concat(en).forEach(function (sp) {
          var k = normalize(sp);
          if (!k) return;
          stats.spellings++;
          if (index[k] && index[k] !== e) {
            var o = index[k];
            problems.push('「' + sp + '」が2か所にあります：' + SUBS[o.sub].ja + '「' + (o.ja[0] || o.en[0]) + '」と ' + SUBS[sub].ja + '「' + (ja[0] || en[0]) + '」（上のほうを使います）');
            return;
          }
          index[k] = e;
        });
      });
    });
    Object.keys(D).forEach(function (sub) { if (!SUBS[sub]) problems.push('「' + sub + '」は小分類の一覧にありません'); });
  })();
  CM.DICT_STATS = stats;
  CM.DICT_PROBLEMS = problems;
  CM.DICT_ENTRIES = entries;

  /** 辞書を引く（見つからなければ null） */
  CM.lookupWord = function (text) {
    var cs = candidates(normalize(text));
    for (var i = 0; i < cs.length; i++) if (index[cs[i]]) return index[cs[i]];
    return null;
  };

  // ------------------------------------------------------------
  // 特別な単語
  // ------------------------------------------------------------
  function specialIndex(list) {
    var idx = {};
    (list || []).forEach(function (sp) {
      splitSpellings(sp.words).forEach(function (w) { var k = normalize(w); if (k) idx[k] = sp; });
    });
    return idx;
  }
  var globalSpecials = specialIndex(CM.SPECIAL_WORDS);
  function findSpecial(text, problem) {
    var cs = candidates(normalize(text));
    var pIdx = problem && problem.specials ? (problem._specialIdx || (problem._specialIdx = specialIndex(problem.specials))) : null;
    for (var i = 0; i < cs.length; i++) {
      if (pIdx && pIdx[cs[i]]) return pIdx[cs[i]];
      if (globalSpecials[cs[i]]) return globalSpecials[cs[i]];
    }
    return null;
  }

  // ------------------------------------------------------------
  // NGワード
  // ------------------------------------------------------------
  var ngExact = {}, ngContains = [];
  (function () {
    var N = CM.NG_WORDS || { exact: [], contains: [] };
    N.exact.forEach(function (w) { var k = normalize(w); if (k) ngExact[k] = true; });
    N.contains.forEach(function (w) { var k = normalize(w); if (k) ngContains.push(k); });
  })();
  /** NGワードか（シェアの文章を作るときにも使う） */
  CM.isNG = function (text) {
    var key = normalize(text);
    if (!key) return false;
    var cs = candidates(key);
    for (var i = 0; i < cs.length; i++) if (ngExact[cs[i]]) return true;
    for (var j = 0; j < ngContains.length; j++) if (key.indexOf(ngContains[j]) >= 0) return true;
    return false;
  };

  // ------------------------------------------------------------
  // 判定
  // ------------------------------------------------------------
  function ruleMatches(rule, entry, key) {
    if (rule.tag) return entry.tags.indexOf(rule.tag) >= 0;
    if (rule.sub) return entry.sub === rule.sub;
    if (rule.cat) return entry.cat === rule.cat;
    if (rule.word) return String(rule.word).split('/').some(function (w) { return CM.lookupWord(w) === entry; });
    return false;
  }

  /** 大分類（と小分類）の共通反応 */
  function commonReaction(entry, key) {
    var R = CM.COMMON_REACTIONS || {}, c = R[entry.cat] || {};
    var s = c.subs && c.subs[entry.sub], base = s || c;
    // いくつかの反応（alts）から、単語ごとに1つ選ぶ（同じ単語なら、いつも同じ反応）
    var list = [base].concat(base.alts || []);
    var h = 0, k = String(key || '');
    for (var i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) % 100003;
    var x = list[h % list.length];
    return { ja: x.ja || '', en: x.en || '', anim: x.anim || base.anim || 'puzzled', act: x.act, by: s ? 'sub' : 'cat' };
  }

  /**
   * 単語を判定する
   *   text    ：プレイヤーが書いた文字（そのまま）
   *   problem ：今の問題（なければ辞書と共通反応だけ）
   *     { specials: [...], rules: [{ tag|sub|cat|word, result: 'success'|'funny', ja, en, anim }] }
   * 返すもの：{ text, key, level, kind, entry, rule, special, reaction, act(演出), route, showTag, chalk }
   */
  CM.judgeWord = function (text, problem) {
    var shown = chars(String(text || '').trim()).slice(0, WORD_MAX).join('');
    var key = normalize(shown);
    var r = { text: shown, key: key, level: -1, kind: 'empty', entry: null, rule: null, special: null, reaction: null, act: null, route: null, showTag: null, chalk: 0 };
    if (!key) return r;
    // 0. NGワード
    if (CM.isNG(shown)) { r.level = 0; r.kind = 'ng'; return r; }
    var entry = CM.lookupWord(shown);
    r.entry = entry;
    // 1. 特別な単語
    var sp = findSpecial(shown, problem);
    if (sp) {
      r.level = 1; r.kind = sp.result; r.special = sp;
      r.reaction = { ja: sp.ja, en: sp.en, anim: sp.anim };
      r.act = sp.act || null;
      r.chalk = sp.result === 'pinch' || sp.result === 'fail' ? CHALK_FAIL : 0;
      r.showTag = entry && entry.tags[0] || null;
      return r;
    }
    // 5. 辞書にない
    if (!entry) { r.level = 5; r.kind = 'unknown'; return r; }
    // 2. 問題のタグ → 3. 問題の小分類など
    if (problem && problem.rules) {
      // その問題で決めた「決まった単語」がいちばん先（例：コウモリの洞窟の「こもりうた」は、音が出ても成功）
      var byWord = problem.rules.filter(function (x) { return x.word; });
      var byTag = problem.rules.filter(function (x) { return x.tag; });
      var byOther = problem.rules.filter(function (x) { return !x.tag && !x.word; });
      var steps = [[2, byWord], [2, byTag], [3, byOther]];
      for (var s = 0; s < steps.length; s++) {
        var list = steps[s][1];
        for (var i = 0; i < list.length; i++) {
          if (ruleMatches(list[i], entry, key)) {
            var rule = list[i], v = (rule.variants && rule.variants[entry.sub]) || {};
            r.level = steps[s][0]; r.kind = rule.result; r.rule = rule;
            r.reaction = { ja: v.ja || rule.ja, en: v.en || rule.en, anim: v.anim || rule.anim };
            r.act = v.act || rule.act || null;
            r.route = rule.route || null;
            r.showTag = rule.tag || entry.tags[0] || null;
            r.chalk = rule.result === 'fail' ? CHALK_FAIL : 0;
            return r;
          }
        }
      }
    }
    // 4. 共通反応（失敗）
    r.level = 4; r.kind = 'fail';
    r.reaction = commonReaction(entry, key);
    r.act = r.reaction.act || null;
    r.showTag = entry.tags[0] || null;
    r.chalk = CHALK_FAIL;
    return r;
  };

  /** 文の中の {w} を、書いた文字に置き換える */
  CM.fillWord = function (s, w) { return String(s || '').replace(/\{w\}/g, w); };
})(window);
