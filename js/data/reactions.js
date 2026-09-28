/*
 * CHALK MAN 特別な単語（隠し反応）と、共通反応
 *
 * ■ 特別な単語（判定の 1番目）
 *   どの問題でも、辞書より先に調べる。書き方は辞書と同じ（/ で区切る。ひらがな＝カタカナも入る）。
 *   result：pinch＝ピンチ（失敗あつかい）／retry＝何も起きずに書き直し（チョークは減らない）
 *
 * ■ 共通反応（判定の 4番目）
 *   問題の条件に当てはまらなかった単語は「失敗」になり、大分類ごとの反応をする。
 *   小分類ごとに別の反応を決めたいときは subs に書く（書いていない小分類は大分類の反応になる）。
 *   {w} には、プレイヤーが書いた文字がそのまま入る。
 *   act ：棒人間と文字の演出の名前（js/game/acts.js）。文章と同じことが起きる演出を選ぶ
 *   anim：判定テスト画面で使う、棒人間の動きだけの簡単な反応
 */
(function (global) {
  'use strict';
  var CM = global.CM = global.CM || {};

  CM.SPECIAL_WORDS = [
    {
      id: 'eraser', act: 'pinch', words: 'こくばんけし/黒板消し/eraser/blackboard eraser/chalkboard eraser/board eraser',
      result: 'pinch', anim: 'erased',
      ja: '黒板消しを呼んでしまった！ 棒人間が消されそうになる！',
      en: 'You summoned the eraser! The stickman is about to be wiped out!'
    },
    {
      id: 'self', act: 'buddy', words: 'ぼうにんげん/棒人間/ちょーくまん/stickman/stick figure/stick man/chalkman/chalk man',
      result: 'retry', anim: 'cheer',
      ja: 'もう1人の棒人間が現れて、握手をして帰っていった。',
      en: 'Another stickman showed up, shook hands, and left.'
    },
    {
      id: 'exit', act: 'arrow', words: 'でぐち/出口/exit/way out',
      result: 'retry', anim: 'puzzled',
      ja: '「{w}」の矢印が出てきた。…ずっと遠くを指している。',
      en: 'An arrow saying "{w}" appeared... pointing very far away.'
    },
    {
      id: 'homework', act: 'pale', words: 'しゅくだい/宿題/homework',
      result: 'retry', anim: 'puzzled',
      ja: '棒人間は宿題を思い出して、青ざめた。',
      en: 'The stickman remembered the homework and turned pale.'
    },
    {
      id: 'gameover', act: 'quake', words: 'げーむおーばー/game over',
      result: 'retry', anim: 'fall',
      ja: '黒板がガタガタ揺れた。…冗談だよ。',
      en: 'The whole board shook... just kidding.'
    }
  ];

  CM.COMMON_REACTIONS = {
    creature: {
      ja: '「{w}」は棒人間をちらっと見て、どこかへ行ってしまった。', en: 'The {w} glanced at the stickman and wandered off.', anim: 'puzzled', act: 'wander',
      subs: {
        bug: { ja: '「{w}」はちょこちょこ歩いて、すき間に隠れてしまった。', en: 'The {w} scuttled away into a crack.', anim: 'puzzled', act: 'scuttle' },
        sea: { ja: '「{w}」は陸の上で、ぴちぴち跳ねるだけ。', en: 'The {w} just flopped around on dry land.', anim: 'puzzled', act: 'flop' },
        fantasy: { ja: '「{w}」は大あくびをして、また眠ってしまった。', en: 'The {w} yawned hugely and went back to sleep.', anim: 'puzzled', act: 'sleep' }
      }
    },
    person: {
      ja: '「{w}」がやって来て「がんばれ！」と言って帰っていった。', en: 'The {w} came by, said "Good luck!", and went home.', anim: 'puzzled', act: 'cheerLeave',
      subs: {
        job: { ja: '「{w}」が来てくれたけど、仕事がいそがしくて帰ってしまった。', en: 'The {w} came, but was too busy and had to leave.', anim: 'puzzled', act: 'busy' }
      }
    },
    food: {
      ja: '「{w}」をおいしく食べた。…でも、何も解決していない。', en: 'The stickman ate the {w}. Delicious... but nothing is solved.', anim: 'cheer', act: 'eat',
      subs: {
        drink: { ja: '「{w}」をごくごく飲んだ。ぷはー。…で、どうしよう。', en: 'Gulped down the {w}. Ahh... now what?', anim: 'cheer', act: 'drink' }
      }
    },
    nature: {
      ja: '「{w}」は、ただそこにあるだけだった。', en: 'The {w} just sat there.', anim: 'puzzled', act: 'sitThere',
      subs: {
        weather: { ja: '「{w}」がちょっとだけ来て、すぐにどこかへ行った。', en: 'A little {w} came and went.', anim: 'puzzled', act: 'drift' }
      }
    },
    made: {
      ja: '「{w}」を使ってみたけど、うまくいかない。', en: 'Tried using the {w}, but it didn\'t help.', anim: 'puzzled', act: 'tryUse',
      subs: {
        weapon: { ja: '「{w}」をふりまわしたけど、空ぶり！', en: 'Swung the {w} around... and missed!', anim: 'swing', act: 'swingMiss' },
        vehicle: { ja: '「{w}」に乗ってみたけど、ここでは動かせない。', en: 'Got into the {w}, but it can\'t move here.', anim: 'puzzled', act: 'rideStuck' },
        toy: { ja: '「{w}」で、ついちょっと遊んでしまった。', en: 'Got a little distracted playing with the {w}.', anim: 'cheer', act: 'play' }
      }
    },
    unseen: {
      ja: '「{w}」は、ふわっと広がって消えてしまった。', en: 'The {w} spread out softly and faded away.', anim: 'puzzled', act: 'fade',
      subs: {
        feeling: { ja: '「{w}」の気持ちは伝わった。でも、目の前の問題はそのまま。', en: 'The feeling of "{w}" came across. The problem is still there, though.', anim: 'idle', act: 'feel' },
        magic: { ja: '「{w}」！ …何も起きなかった。', en: '"{w}!" ...Nothing happened.', anim: 'puzzled', act: 'fizzle' }
      }
    }
  };
})(window);
