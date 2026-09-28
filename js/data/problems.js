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
 */
(function (global) {
  'use strict';
  var CM = global.CM = global.CM || {};

  CM.CHAPTERS = {
    1: { ja: '第1章　教室の黒板', en: 'Chapter 1: The Classroom Board' }
  };

  CM.PROBLEMS = [
    // ------------------------------------------------------------
    // 1問目：足元に地面がない
    // ------------------------------------------------------------
    {
      id: 'c1q1', chapter: 1, scene: 'noGround',
      title: { ja: '足元に地面がない', en: 'No ground ahead' },
      text: {
        ja: '放課後の黒板で、棒人間が動き出した。でも立っているのは短いチョークの線の上だけ。この先には地面がない！',
        en: 'After school, a stickman on the blackboard came to life. But it is standing on a tiny chalk line, and there is no ground ahead!'
      },
      rules: [
        { tag: 'long', result: 'success', act: 'extend',
          ja: '「{w}」がぐーんとのびて、道になった！ 棒人間は歩き出した。',
          en: 'The {w} stretched out into a long path! Off the stickman goes.' },
        { tag: 'fly', result: 'success', act: 'ride',
          ja: '「{w}」に乗って、ふわふわと先へ進んだ！',
          en: 'Hopped on the {w} and floated onward!' },
        { tag: 'hard', result: 'success', act: 'stepping',
          ja: 'かたい「{w}」をいくつも並べて、足場にした！',
          en: 'Lined up a row of hard {w} as stepping stones!' },
        { sub: 'land', result: 'success', act: 'floor',
          ja: '「{w}」がドスンと置かれて、地面になった！ 棒人間は歩き出した。',
          en: 'The {w} landed with a thud and became solid ground! Off the stickman goes.' },
        { cat: 'person', result: 'funny', act: 'carry',
          ja: '「{w}」がやって来て、棒人間をおんぶして運んでくれた！',
          en: 'The {w} showed up and gave the stickman a piggyback ride!' }
      ]
    },

    // ------------------------------------------------------------
    // 2問目：暗くて前が見えない
    // ------------------------------------------------------------
    {
      id: 'c1q2', chapter: 1, scene: 'dark',
      title: { ja: '暗くて前が見えない', en: 'Too dark to see' },
      text: {
        ja: 'だれかが教室の電気を消した。あたりは真っ暗で、前がまったく見えない！',
        en: 'Someone switched off the classroom lights. It is pitch black and the stickman cannot see a thing!'
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
    // 3問目：崖の向こうへ渡りたい
    // ------------------------------------------------------------
    {
      id: 'c1q3', chapter: 1, scene: 'cliff',
      title: { ja: '崖の向こうへ渡りたい', en: 'Cross the cliff' },
      text: {
        ja: '目の前に、黒板のひび割れみたいな深い崖。向こう側へ渡りたい！',
        en: 'A deep cliff, like a crack in the blackboard, blocks the way. Time to get across!'
      },
      rules: [
        { tag: 'fly', result: 'success', act: 'ride',
          ja: '「{w}」に乗って、ふわりと崖を飛びこえた！',
          en: 'Rode the {w} and floated over the cliff!' },
        { tag: 'long', result: 'success', act: 'extend',
          ja: '「{w}」がのびて、崖の向こうまで届いた！ その上を渡った。',
          en: 'The {w} stretched all the way across, and the stickman walked over it!' },
        { sub: 'building', result: 'success', act: 'bridge',
          ja: '「{w}」が崖にかかって、橋になった！',
          en: 'The {w} fell across the gap and became a bridge!' },
        { sub: 'bug', result: 'funny', act: 'swarm',
          ja: '「{w}」の大群がやって来て、つながって橋になった！',
          en: 'A swarm of {w} marched in and linked up into a bridge!' }
      ]
    },

    // ------------------------------------------------------------
    // 4問目：お腹がすいた
    // ------------------------------------------------------------
    {
      id: 'c1q4', chapter: 1, scene: 'hungry',
      title: { ja: 'お腹がすいた', en: 'So hungry' },
      text: {
        ja: 'ぐぅ〜。棒人間のおなかが鳴った。何か食べないと、もう歩けない…',
        en: 'Grrrumble. The stickman\'s tummy is growling. It can\'t walk another step without a snack...'
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
    // 5問目：犬に吠えられる
    // ------------------------------------------------------------
    {
      id: 'c1q5', chapter: 1, scene: 'dog',
      title: { ja: 'イヌに吠えられる', en: 'A barking dog' },
      text: {
        ja: 'だれかが描いた「イヌ」が道をふさいで、ワンワン吠えている！',
        en: 'Someone drew a "DOG", and it is blocking the path, barking like crazy!'
      },
      rules: [
        { tag: 'cute', result: 'success', act: 'charm',
          ja: 'かわいい「{w}」に、イヌもメロメロ。道をあけてくれた！',
          en: 'The DOG melted at the cute {w} and stepped aside!' },
        { tag: 'sound', result: 'success', act: 'scare',
          ja: '「{w}」の大きな音に、イヌはびっくりして逃げていった！',
          en: 'The {w} made a loud noise, and the DOG ran away!' },
        { tag: 'edible', result: 'success', act: 'feed',
          ja: '「{w}」を投げると、イヌは夢中で食べはじめた！ そのすきに通りぬけた。',
          en: 'Tossed the {w}. While the DOG was busy eating, the stickman slipped past!' },
        { sub: 'toy', result: 'success', act: 'fetch',
          ja: '「{w}」を遠くへ投げると、イヌは追いかけていった！',
          en: 'Threw the {w} far away, and the DOG chased after it!' },
        { sub: 'animal', result: 'funny', act: 'playmate',
          ja: '「{w}」とイヌが仲良くなって、いっしょに遊びに行ってしまった！',
          en: 'The {w} and the DOG became friends and ran off to play!' }
      ]
    },

    // ------------------------------------------------------------
    // 6問目：大きな雨雲が来る（分岐：飛ぶ＝空ルート／それ以外＝地下ルート）
    // ------------------------------------------------------------
    {
      id: 'c1q6', chapter: 1, scene: 'rain',
      title: { ja: '大きな雨雲が来る', en: 'A huge rain cloud' },
      text: {
        ja: '大きな「あまぐも」がやって来た！ 雨にぬれたら、チョークが流されてしまう。上へ逃げる？ 下へ逃げる？',
        en: 'A huge "RAIN CLOUD" is rolling in! Rain will wash the chalk away. Escape up high, or down below?'
      },
      rules: [
        { tag: 'fly', result: 'success', act: 'rise', route: 'sky',
          ja: '「{w}」に乗って、雲の上まで飛んでいった！',
          en: 'Rode the {w} all the way above the clouds!' },
        { tag: 'hard', result: 'success', act: 'dig', route: 'under',
          ja: 'かたい「{w}」で地面を掘って、穴の中へ逃げこんだ！',
          en: 'Dug a hole with the hard {w} and escaped underground!' },
        { tag: 'swim', result: 'funny', act: 'swimDown', route: 'under',
          ja: '「{w}」と水たまりで泳いでいたら、そのまま地下へ流されていった！',
          en: 'Went for a swim in the puddles with the {w}... and got washed down underground!' },
        { sub: 'building', result: 'success', act: 'shelter', route: 'under',
          ja: '「{w}」に逃げこむと、床に地下へ続く穴があった！',
          en: 'Ran into the {w} and found a hole leading underground!' },
        { word: '傘', result: 'success', act: 'umbrella', route: 'under',
          ja: '「{w}」をさして歩くと、雨宿りできる穴を見つけた！',
          en: 'Walked under the {w} and found a hole to wait out the rain!' }
      ]
    }
  ];
})(window);
