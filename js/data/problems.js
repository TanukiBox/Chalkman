/*
 * ============================================================
 *  CHALK MAN 問題データ
 * ============================================================
 *
 * ■ 問題を1つ足すときは、下の CM.PROBLEMS に { ... } を1つ書き足すだけ。
 *
 *   {
 *     id: 'c1q3',                 // かぶらない名前
 *     chapter: 1,                 // 章
 *     scene: 'cliff',             // 黒板の様子（js/game/scenes.js にある名前）
 *     title: { ja: '…', en: '…' },  // 見出し（短く）
 *     text:  { ja: '…', en: '…' },  // 課題の説明（書く欄に出る）
 *     rules: [                    // 成功条件 2〜4個 と 珍回答 1〜2個
 *       { tag: 'fly', result: 'success', act: 'ride',
 *         ja: '「{w}」に乗って…', en: 'Rode the {w}…' },
 *       { sub: 'bug', result: 'funny', act: 'swarm', ja: '…', en: '…' }
 *     ]
 *   }
 *
 * ■ 条件の書き方（どれか1つ）
 *   tag: 'fly'        … タグ（fly swim hot cold heavy big small long hard soft glow sound edible danger cute）
 *   sub: 'building'   … 小分類（辞書 dictionary.js の小分類の名前）
 *   cat: 'food'       … 大分類（creature person food nature made unseen）
 *   word: '傘'        … 決まった単語（表記ゆれは自動でそろえる）
 *   判定では「タグの条件」が先、「小分類・大分類・単語の条件」が後。同じ段の中では上に書いたものが先。
 *
 * ■ result：success＝成功、funny＝珍回答（先に進める・チョークは減らない）
 *   条件に当てはまらない単語は失敗（チョーク −20）で、reactions.js の共通反応になる。
 *
 * ■ act：棒人間と文字の演出の名前（js/game/acts.js）。文章と同じことが起きる演出を選ぶ。
 *   {w} には、プレイヤーが書いた文字がそのまま入る。
 *
 * ■ variants：同じ条件でも、小分類によって文章と演出を変えたいとき
 *     variants: { drink: { act: 'drink', ja: '…', en: '…' } }
 *
 * ■ route：分岐の問題で、進むルート（'sky'＝空ルート／'under'＝地下ルート）
 *
 * ■ failAfter：失敗したとき、共通反応のあとに続けて起きること（なくてもよい）
 *     failAfter: { act: 'ledgeFall', ja: '…足元の線が崩れて、下にドテッ！', en: '…' }
 */
(function (global) {
  'use strict';
  var CM = global.CM = global.CM || {};

  // ------------------------------------------------------------
  // ストーリー（試遊版で決定）
  //   理科の授業「水のゆくえ」が終わった放課後。黒板には山・川・海・雲の図が残っている。
  //   その図のすみに、だれかが落書きした棒人間が動き出した。
  //   明日の朝、日直が黒板を消してしまう。棒人間は、教室に置き忘れられた自由帳へ逃げこむ。
  //   第1章：放課後の黒板（授業の図のはし → 図の雨雲で「蒸発して空へ」か「しみこんで地下へ」に分かれる）
  //   第2章：空ルート（雲・雷・風・星）／地下ルート（地下水・洞窟）
  //   第3章：翌朝。黒板消しが迫る前に、自由帳（出口）へ。最後に、描いてくれた子へ書き置きを残す
  // ------------------------------------------------------------
  CM.CHAPTERS = {
    1: { ja: '第1章　放課後の黒板', en: 'Chapter 1: The Board After School' }
  };
  CM.TOTAL_PROBLEMS = 20;   // 全部で何問か（黒板の地図に使う）

  CM.PROBLEMS = [
    // ------------------------------------------------------------
    // 1問目：足元に地面がない（図のはしの高い所。足元の線が崩れかけ → 下の地面まで無事に降りる）
    // ------------------------------------------------------------
    {
      id: 'c1q1', chapter: 1, scene: 'ledge',
      title: { ja: '足元の線が消えかけ', en: 'The line is crumbling' },
      text: {
        ja: '棒人間が落書きされたのは、図のはしの高い所。足元の線がぽろぽろ崩れはじめた！ このまま落ちたら、下の地面にドテッ。',
        en: 'The stickman was doodled high up at the edge of the diagram, and the line under its feet is crumbling! One wrong step and it will hit the ground hard.'
      },
      rules: [
        { tag: 'edible', result: 'funny', act: 'plunge',
          ja: '落ちた先は「{w}」の上。頭からずぼっ！ …おいしい着地だった。',
          en: 'Landed head-first in the {w}. Splat! ...A delicious landing.' },
        { tag: 'soft', result: 'success', act: 'cushion',
          ja: '「{w}」がクッションになって、ぽよんと着地！',
          en: 'The {w} made a soft cushion. Boing, safe landing!' },
        { tag: 'fly', result: 'success', act: 'catch',
          ja: '落ちる棒人間を「{w}」が空中でキャッチ。ふわりと下まで運んでくれた！',
          en: 'The {w} caught the falling stickman in midair and floated it down!' },
        { tag: 'big', result: 'success', act: 'tower',
          ja: '大きな「{w}」が足場になった。乗ったまま小さくなって、地面まで降ろしてくれた！',
          en: 'The big {w} became a platform, then shrank and set the stickman down gently!' },
        { tag: 'swim', result: 'success', act: 'splash',
          ja: '「{w}」のおかげで、水の中にばしゃーんと着地！ 泳いで岸に上がった。',
          en: 'Thanks to the {w}, it splashed down into water and swam ashore!' }
      ],
      failAfter: { act: 'ledgeFall', ja: '…そのとき足元の線が崩れて、下にドテッ！', en: '...Then the line gave way. THUD!' }
    },

    // ------------------------------------------------------------
    // 2問目：暗くて前が見えない（日直が電気を消して帰った）
    // ------------------------------------------------------------
    {
      id: 'c1q2', chapter: 1, scene: 'dark',
      title: { ja: '真っ暗で見えない', en: 'Lights out' },
      text: {
        ja: '日直が教室の電気を消して帰ってしまった。黒板の上は真っ暗で、前がまったく見えない！',
        en: 'The class monitor switched off the lights and went home. The board is pitch black!'
      },
      rules: [
        { tag: 'glow', result: 'success', act: 'light',
          ja: '「{w}」がピカッと光って、道が見えた！',
          en: 'The {w} lit up and showed the way!' },
        { tag: 'hot', result: 'success', act: 'torch',
          ja: '「{w}」を高くかかげると、赤く光ってあたりを照らした！',
          en: 'Held the {w} up high. It glowed red and lit up the way!' },
        { tag: 'sound', result: 'funny', act: 'echo',
          ja: '「{w}」の音がこだまして、なんとなく道がわかった！',
          en: 'The {w} echoed around, and the stickman could sort of hear the way!' }
      ]
    },

    // ------------------------------------------------------------
    // 3問目：崖の向こうへ渡りたい（先生が描いた山の図の「谷」）
    // ------------------------------------------------------------
    {
      id: 'c1q3', chapter: 1, scene: 'cliff',
      title: { ja: '図の「谷」を渡りたい', en: 'Across the valley' },
      text: {
        ja: '先生が描いた山の図。その間の深い「谷」を渡らないと、先へ進めない！',
        en: 'The teacher\'s mountain diagram has a deep "valley" in the middle. Time to get across!'
      },
      rules: [
        { tag: 'fly', result: 'success', act: 'ride',
          ja: '「{w}」に乗って、ふわりと谷を飛びこえた！',
          en: 'Rode the {w} and floated over the valley!' },
        { tag: 'long', result: 'success', act: 'extend',
          ja: '「{w}」がのびて、谷の向こうまで届いた！ その上を渡った。',
          en: 'The {w} stretched all the way across, and the stickman walked over it!' },
        { sub: 'building', result: 'success', act: 'bridge',
          ja: '「{w}」が谷にかかって、橋になった！',
          en: 'The {w} fell across the valley and became a bridge!' },
        { sub: 'bug', result: 'funny', act: 'swarm',
          ja: '「{w}」の大群がやって来て、つながって橋になった！',
          en: 'A swarm of {w} marched in and linked up into a bridge!' }
      ]
    },

    // ------------------------------------------------------------
    // 4問目：お腹がすいた（黒板のすみに今日の給食の献立）
    // ------------------------------------------------------------
    {
      id: 'c1q4', chapter: 1, scene: 'hungry',
      title: { ja: 'おなかがすいた', en: 'So hungry' },
      text: {
        ja: 'ぐぅ〜。黒板のすみに、今日の給食の献立がまだ残っている。見ていたら、おなかが鳴ってきた…',
        en: 'Grrrumble. Today\'s lunch menu is still written in the corner of the board. Just looking at it makes the stickman hungry...'
      },
      rules: [
        { tag: 'edible', result: 'success', act: 'eat',
          ja: '「{w}」をもぐもぐ食べた。おなかいっぱい！',
          en: 'Munched on the {w}. So full!',
          variants: {
            drink: { act: 'drink', ja: '「{w}」をごくごく飲んだ。ぷはー、元気が出た！', en: 'Gulped down the {w}. Ahh, much better!' }
          } },
        { cat: 'food', result: 'success', act: 'eat',
          ja: '「{w}」をいただきます！ おなかいっぱい！',
          en: 'Ate the {w}. Thanks for the meal!' },
        { cat: 'person', result: 'funny', act: 'chef',
          ja: '「{w}」が何か作ってくれた。…チョークの粉のスープだった！',
          en: 'The {w} cooked something up... it was chalk-dust soup!' },
        { sub: 'plant', result: 'funny', act: 'nibble',
          ja: '「{w}」をかじってみた。…草の味がする。',
          en: 'Took a bite of the {w}... it tastes like grass.' }
      ]
    },

    // ------------------------------------------------------------
    // 5問目：犬に吠えられる（となりの席の子の落書きの「犬」）
    // ------------------------------------------------------------
    {
      id: 'c1q5', chapter: 1, scene: 'dog',
      title: { ja: 'となりの席の落書き', en: 'The doodle next door' },
      text: {
        ja: 'となりの席の子が落書きした「犬」が、道をふさいでワンワン吠えている！',
        en: 'A "DOG" doodled by the kid in the next seat is blocking the path, barking like crazy!'
      },
      rules: [
        { tag: 'cute', result: 'success', act: 'charm',
          ja: 'かわいい「{w}」に、犬もメロメロ。道をあけてくれた！',
          en: 'The DOG melted at the cute {w} and stepped aside!' },
        { tag: 'sound', result: 'success', act: 'scare',
          ja: '「{w}」の大きな音に、犬はびっくりして逃げていった！',
          en: 'The {w} made a loud noise, and the DOG ran away!' },
        { tag: 'edible', result: 'success', act: 'feed',
          ja: '「{w}」を投げると、犬は夢中で食べはじめた！ そのすきに通りぬけた。',
          en: 'Tossed the {w}. While the DOG was busy eating, the stickman slipped past!' },
        { sub: 'toy', result: 'success', act: 'fetch',
          ja: '「{w}」を遠くへ投げると、犬は追いかけていった！',
          en: 'Threw the {w} far away, and the DOG chased after it!' },
        { sub: 'animal', result: 'funny', act: 'playmate',
          ja: '「{w}」と犬が仲良くなって、いっしょに遊びに行ってしまった！',
          en: 'The {w} and the DOG became friends and ran off to play!' }
      ]
    },

    // ------------------------------------------------------------
    // 6問目：大きな雨雲が来る（図の雨雲。分岐：上へ＝空ルート／下へ＝地下ルート。穴に落ちずに進む）
    // ------------------------------------------------------------
    {
      id: 'c1q6', chapter: 1, scene: 'rain',
      title: { ja: '図の雨雲が動き出した', en: 'The rain cloud moves' },
      text: {
        ja: '図に描かれた「雨雲」が、ゴロゴロ動き出した！ 雨にぬれたら、チョークが流されてしまう。上へのがれる？ それとも下へ？',
        en: 'The "RAIN CLOUD" in the diagram started to move! Rain will wash the chalk away. Escape up, or down?'
      },
      rules: [
        { tag: 'fly', result: 'success', act: 'rise', route: 'sky',
          ja: '「{w}」に乗って、雲の上まで飛んでいった！',
          en: 'Rode the {w} all the way above the clouds!' },
        { tag: 'hot', result: 'success', act: 'steamUp', route: 'sky',
          ja: '「{w}」の熱で、雨が湯気になった！ 湯気に乗って、空へのぼっていく。',
          en: 'The heat of the {w} turned the rain into steam! The stickman rode the steam up into the sky.' },
        { tag: 'swim', result: 'success', act: 'flowDown', route: 'under',
          ja: '「{w}」をボートにして、雨水の流れに乗った！ みぞを通って、黒板の下のほうへ。',
          en: 'Used the {w} as a boat and rode the rainwater down a gutter to the bottom of the board!' },
        { tag: 'cold', result: 'success', act: 'iceSlide', route: 'under',
          ja: '「{w}」の冷たさで、雨がカチコチに凍った！ 氷のすべり台で、下へつるーん。',
          en: 'The cold {w} froze the rain solid! Wheee, down the ice slide!' },
        { sub: 'weather', result: 'funny', act: 'cloudFriend', route: 'sky',
          ja: '「{w}」と雨雲が仲良くなった。雨がやんで、雲に乗せてもらって空へ！',
          en: 'The {w} and the rain cloud became friends. The rain stopped, and the cloud gave the stickman a ride up!' },
        { sub: 'building', result: 'funny', act: 'houseFlow', route: 'under',
          ja: '「{w}」で雨宿りしていたら、水があふれて「{w}」ごと下へ流された！',
          en: 'Took shelter in the {w}... until the water rose and washed the whole {w} downstream!' }
      ]
    }
  ];
})(window);
