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
      ja: '「{w}」は棒人間をちらっと見て、どこかへ行ってしまった。', en: 'The {w} glanced at the stickman and wandered off.', anim: 'puzzled', act: 'wander', alts: [
          { ja: '「{w}」は棒人間のうしろを、ついて回るだけ。…かわいいけど、何も解決しない。', en: 'The {w} just followed the stickman around. Cute, but it didn\'t solve anything.', act: 'followMe' },
          { ja: '「{w}」は、その場でごろんと寝てしまった。', en: 'The {w} flopped down and fell asleep right there.', act: 'napHere' },
          { ja: '「{w}」は棒人間のにおいをくんくんかいで、満足そうに帰っていった。', en: 'The {w} sniffed the stickman, looked satisfied, and left.', act: 'sniff' }
        ],
      subs: {
        bug: { ja: '「{w}」はちょこちょこ歩いて、すき間に隠れてしまった。', en: 'The {w} scuttled away into a crack.', anim: 'puzzled', act: 'scuttle', alts: [
          { ja: '「{w}」が体をはいのぼってきて、くすぐったい！', en: 'The {w} crawled up the stickman. That tickles!', act: 'tickle' }
        ] },
        sea: { ja: '「{w}」は陸の上で、ぴちぴち跳ねるだけ。', en: 'The {w} just flopped around on dry land.', anim: 'puzzled', act: 'flop', alts: [
          { ja: '「{w}」が水をピューッとふいて、棒人間はびしょぬれ。', en: 'The {w} squirted water. The stickman got soaked.', act: 'squirt' }
        ] },
        bird: { ja: '「{w}」が棒人間の頭にとまって、ひと休み。', en: 'The {w} landed on the stickman\'s head for a rest.', anim: 'puzzled', act: 'perch', alts: [
          { ja: '「{w}」は棒人間をちらっと見て、どこかへ行ってしまった。', en: 'The {w} glanced at the stickman and flew off.', act: 'wander' }
        ] },
        fantasy: { ja: '「{w}」は大あくびをして、また眠ってしまった。', en: 'The {w} yawned hugely and went back to sleep.', anim: 'puzzled', act: 'sleep', alts: [
          { ja: '「{w}」は魔法を見せびらかして、満足して帰っていった。', en: 'The {w} showed off some magic, then left, very pleased with itself.', act: 'showOff' }
        ] }
      }
    },
    person: {
      ja: '「{w}」がやって来て「がんばれ！」と言って帰っていった。', en: 'The {w} came by, said "Good luck!", and went home.', anim: 'puzzled', act: 'cheerLeave', alts: [
          { ja: '「{w}」がやって来て、記念写真をとって帰っていった。パシャッ！', en: 'The {w} came by, took a souvenir photo, and left. Click!', act: 'photo' },
          { ja: '「{w}」に「気をつけてね」と、長〜いお話をされた…', en: 'The {w} gave a looong "be careful" speech...', act: 'lecture' }
        ],
      subs: {
        job: { ja: '「{w}」が来てくれたけど、仕事がいそがしくて帰ってしまった。', en: 'The {w} came, but was too busy and had to leave.', anim: 'puzzled', act: 'busy', alts: [
          { ja: '「{w}」がやって来て、記念写真をとって帰っていった。パシャッ！', en: 'The {w} came by, took a souvenir photo, and left. Click!', act: 'photo' }
        ] }
      }
    },
    food: {
      ja: '「{w}」をおいしく食べた。…でも、何も解決していない。', en: 'The stickman ate the {w}. Delicious... but nothing is solved.', anim: 'cheer', act: 'eat', alts: [
          { ja: '「{w}」を食べようとしたら、落としてころころ…。', en: 'Went to eat the {w}, dropped it, and it rolled away...', act: 'dropFood' },
          { ja: '「{w}」を食べすぎて、おなかいっぱい。動けない…', en: 'Ate too much {w}. Too full to move...', act: 'overeat' }
        ],
      subs: {
        drink: { ja: '「{w}」をごくごく飲んだ。ぷはー。…で、どうしよう。', en: 'Gulped down the {w}. Ahh... now what?', anim: 'cheer', act: 'drink', alts: [
          { ja: '「{w}」をこぼしてしまった。あちゃー。', en: 'Spilled the {w}. Oops.', act: 'spill' }
        ] }
      }
    },
    nature: {
      ja: '「{w}」は、ただそこにあるだけだった。', en: 'The {w} just sat there.', anim: 'puzzled', act: 'sitThere', alts: [
          { ja: '「{w}」は、ころころ転がって、どこかへ行ってしまった。', en: 'The {w} rolled away somewhere.', act: 'rollAway' }
        ],
      subs: {
        weather: { ja: '「{w}」がちょっとだけ来て、すぐにどこかへ行った。', en: 'A little {w} came and went.', anim: 'puzzled', act: 'drift', alts: [
          { ja: '「{w}」が棒人間の頭の上にだけ来た。…びしょぬれ。', en: 'The {w} hovered right over the stickman\'s head. Soaked.', act: 'rainOnMan' }
        ] }
      }
    },
    made: {
      ja: '「{w}」を使ってみたけど、うまくいかない。', en: 'Tried using the {w}, but it didn\'t help.', anim: 'puzzled', act: 'tryUse', alts: [
          { ja: '「{w}」を使おうとしたら、バキッとこわれてしまった。', en: 'Tried to use the {w}, and it broke. Crack!', act: 'breakApart' },
          { ja: '「{w}」の使い方がわからなくて、ぐるぐる回してみた。', en: 'Couldn\'t figure out the {w}, so just turned it around and around.', act: 'howToUse' }
        ],
      subs: {
        weapon: { ja: '「{w}」をふりまわしたけど、空ぶり！', en: 'Swung the {w} around... and missed!', anim: 'swing', act: 'swingMiss', alts: [
          { ja: '「{w}」が重すぎて、持ち上がらない！', en: 'The {w} was too heavy to lift!', act: 'tooHeavy' }
        ] },
        vehicle: { ja: '「{w}」に乗ってみたけど、ここでは動かせない。', en: 'Got into the {w}, but it can\'t move here.', anim: 'puzzled', act: 'rideStuck', alts: [
          { ja: '「{w}」に乗ったけど、プスン…。動かなくなった。', en: 'Got in the {w}... sputter, sputter. It died.', act: 'outOfGas' }
        ] },
        toy: { ja: '「{w}」で、ついちょっと遊んでしまった。', en: 'Got a little distracted playing with the {w}.', anim: 'cheer', act: 'play' }
      }
    },
    unseen: {
      ja: '「{w}」は、ふわっと広がって消えてしまった。', en: 'The {w} spread out softly and faded away.', anim: 'puzzled', act: 'fade', alts: [
          { ja: '「{w}」…チクタク、チクタク。待ってみたけど、何も変わらなかった。', en: '"{w}"... tick tock, tick tock. Waited, but nothing changed.', act: 'waitTime' }
        ],
      subs: {
        feeling: { ja: '「{w}」の気持ちは伝わった。でも、目の前の問題はそのまま。', en: 'The feeling of "{w}" came across. The problem is still there, though.', anim: 'idle', act: 'feel', alts: [
          { ja: '「{w}」と書いたら、なんだかてれてしまった。', en: 'Writing "{w}" made the stickman blush.', act: 'blush' }
        ] },
        magic: { ja: '「{w}」！ …何も起きなかった。', en: '"{w}!" ...Nothing happened.', anim: 'puzzled', act: 'fizzle', alts: [
          { ja: '「{w}」！ …ボンッ！ 棒人間の頭が、ちりちりになった。', en: '"{w}!" ...BOOM! The stickman\'s head got all frizzy.', act: 'backfire' }
        ] }
      }
    }
  };
})(window);
