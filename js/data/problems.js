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
  // ストーリー（試遊2回目で決定）
  //   放課後の黒板は、生徒たちの落書きでいっぱい。その中の棒人間が動き出した。
  //   明日の朝、日直が黒板を消してしまう。落書きの中を冒険して、教室に置き忘れられた自由帳へ逃げこむ。
  //   問題に出てくる生き物や物（ビル・犬・ケーキ・木 など）は「絵」で描く。プレイヤーが書いたことばだけが「文字」の物になる。
  //   第1章：落書きだらけの黒板 → 大きな木の落書きで「てっぺん（空ルート）」か「根っこ（地下ルート）」に分かれる
  //   第2章：空ルート／地下ルート　第3章：翌朝。黒板消しが迫る前に自由帳へ。最後に、描いてくれた子へ書き置き
  // ------------------------------------------------------------
  CM.CHAPTERS = {
    1: { ja: '第1章　落書きだらけの黒板', en: 'Chapter 1: A Board Full of Doodles' }
  };
  CM.TOTAL_PROBLEMS = 20;   // 全部で何問か（黒板の地図に使う）

  CM.PROBLEMS = [
    // 1問目：真っ暗で見えない（日直が電気を消して帰った）
    {
      id: 'c1q1', chapter: 1, scene: 'dark',
      title: { ja: '真っ暗で見えない', en: 'Lights out' },
      text: {
        ja: '動き出したとたん、日直が教室の電気を消して帰ってしまった。黒板の上は真っ暗で、前がまったく見えない！',
        en: 'Just as the stickman started moving, the class monitor switched off the lights and went home. The board is pitch black!'
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

    // 2問目：高いビルの落書きの屋上（はじめは寄りの画。カメラを引いて高さを見せる）
    {
      id: 'c1q2', chapter: 1, scene: 'tower',
      title: { ja: '高いビルのてっぺん', en: 'Top of a tall building' },
      text: {
        ja: '明るくなった道を進んでいくと…ここは、だれかが落書きした高〜いビルの屋上！ 地面まで、無事に降りたい。',
        en: 'Following the path, the stickman ended up on the roof of someone\'s doodle of a VERY tall building! It needs to get safely down to the ground.'
      },
      rules: [
        { tag: 'edible', result: 'funny', act: 'plungeFall',
          ja: '下に「{w}」を置いて飛びおりた。頭からずぼっ！ …おいしい着地だった。',
          en: 'Put the {w} below and jumped. Splat, head-first! ...A delicious landing.' },
        { tag: 'long', result: 'success', act: 'climbDown',
          ja: '長い「{w}」を屋上からたらして、するすると地面まで降りた！',
          en: 'Dangled the long {w} from the roof and slid all the way down!' },
        { tag: 'fly', result: 'success', act: 'catchFall',
          ja: '思いきって飛びおりると、「{w}」が空中でキャッチ。ふわりと地面まで運んでくれた！',
          en: 'The stickman jumped, and the {w} caught it in midair and floated it down!' },
        { tag: 'soft', result: 'success', act: 'cushionFall',
          ja: '下に「{w}」を置いて飛びおりた。ぽよーんと、ふんわり着地！',
          en: 'Put the {w} below and jumped. Boing, a soft landing!' },
        { tag: 'big', result: 'success', act: 'elevator',
          ja: '大きな「{w}」の上に飛びおりた。「{w}」は小さくなりながら、地面まで降ろしてくれた！',
          en: 'Jumped onto the big {w}, which shrank down and set the stickman on the ground!' }
      ],
      failAfter: { act: 'tumble', ja: '…そのとき足をすべらせて、下までまっさかさま。ドテッ！', en: '...Then the stickman slipped off the edge and fell all the way down. THUD!' }
    },

    // 3問目：吠える犬の落書き（絵）
    {
      id: 'c1q3', chapter: 1, scene: 'dog',
      title: { ja: '吠える犬の落書き', en: 'The barking dog doodle' },
      text: {
        ja: 'だれかが描いた犬の落書きが動き出して、道をふさいでワンワン吠えている！',
        en: 'Someone\'s dog doodle came to life, and it is blocking the path, barking like crazy!'
      },
      rules: [
        { tag: 'cute', result: 'success', act: 'charm',
          ja: 'かわいい「{w}」に、犬もメロメロ。道をあけてくれた！',
          en: 'The dog melted at the cute {w} and stepped aside!' },
        { tag: 'sound', result: 'success', act: 'scare',
          ja: '「{w}」の大きな音に、犬はびっくりして逃げていった！',
          en: 'The {w} made a loud noise, and the dog ran away!' },
        { tag: 'edible', result: 'success', act: 'feed',
          ja: '「{w}」を投げると、犬は夢中で食べはじめた！ そのすきに通りぬけた。',
          en: 'Tossed the {w}. While the dog was busy eating, the stickman slipped past!' },
        { sub: 'toy', result: 'success', act: 'fetch',
          ja: '「{w}」を遠くへ投げると、犬は追いかけていった！',
          en: 'Threw the {w} far away, and the dog chased after it!' },
        { sub: 'animal', result: 'funny', act: 'playmate',
          ja: '「{w}」と犬が仲良くなって、いっしょに遊びに行ってしまった！',
          en: 'The {w} and the dog became friends and ran off to play!' }
      ]
    },

    // 4問目：古い黒板の大きなひび割れ
    {
      id: 'c1q4', chapter: 1, scene: 'crack',
      title: { ja: '黒板の大きなひび', en: 'A big crack in the board' },
      text: {
        ja: '古い黒板に、大きなひび割れ。落ちたら黒板のすき間に消えてしまう！ 向こう側へ渡りたい。',
        en: 'The old blackboard has a huge crack. Fall in, and you vanish into the gap! Time to get across.'
      },
      rules: [
        { tag: 'fly', result: 'success', act: 'ride',
          ja: '「{w}」に乗って、ふわりとひび割れを飛びこえた！',
          en: 'Rode the {w} and floated over the crack!' },
        { tag: 'long', result: 'success', act: 'extend',
          ja: '「{w}」がのびて、向こう側まで届いた！ その上を渡った。',
          en: 'The {w} stretched all the way across, and the stickman walked over it!' },
        { sub: 'building', result: 'success', act: 'bridge',
          ja: '「{w}」がひび割れにかかって、橋になった！',
          en: 'The {w} fell across the crack and became a bridge!' },
        { sub: 'bug', result: 'funny', act: 'swarm',
          ja: '「{w}」の大群がやって来て、つながって橋になった！',
          en: 'A swarm of {w} marched in and linked up into a bridge!' }
      ]
    },

    // 5問目：おいしそうなケーキの落書き（でも絵は食べられない）
    {
      id: 'c1q5', chapter: 1, scene: 'cake',
      title: { ja: 'ケーキの落書き', en: 'A cake doodle' },
      text: {
        ja: 'ぐぅ〜。だれかが描いた、おいしそうなケーキの落書き。でも、絵は食べられない…。書いたことばなら、本物になるのに！',
        en: 'Grrrumble. Someone doodled a delicious-looking cake. But you can\'t eat a drawing... Written words, though, become real!'
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

    // 6問目：大きな木の落書き（分かれ道：てっぺん＝空ルート／根っこ＝地下ルート）
    {
      id: 'c1q6', chapter: 1, scene: 'tree',
      title: { ja: '大きな木の落書き', en: 'A giant tree doodle' },
      text: {
        ja: 'だれかが描いた大きな木が、道をふさいでいる。てっぺんは雲の中、根っこは地面の下まで続いている。上へ行く？ 下へ行く？',
        en: 'A giant tree doodle blocks the way. Its top disappears into the clouds, and its roots go deep underground. Up, or down?'
      },
      rules: [
        { tag: 'long', result: 'success', act: 'climbUp', route: 'sky',
          ja: '長い「{w}」を幹に立てかけて、雲の上までのぼっていった！',
          en: 'Leaned the long {w} against the trunk and climbed up into the clouds!' },
        { tag: 'fly', result: 'success', act: 'flyUp', route: 'sky',
          ja: '「{w}」に乗って、木のてっぺんの雲の上まで飛んでいった！',
          en: 'Rode the {w} up past the treetop and above the clouds!' },
        { tag: 'hard', result: 'success', act: 'digDown', route: 'under',
          ja: 'かたい「{w}」で根っこの間を掘って、地下への道を作った！',
          en: 'Dug between the roots with the hard {w} and made a path underground!' },
        { tag: 'small', result: 'success', act: 'shrinkIn', route: 'under',
          ja: '小さな「{w}」が、根っこのすき間を見つけた！ あとについて、地下へもぐりこんだ。',
          en: 'The tiny {w} found a gap between the roots! The stickman followed it underground.' },
        { sub: 'bug', result: 'funny', act: 'antsDig', route: 'under',
          ja: '「{w}」の大群が根っこをかじって、地下への道をあけてくれた！',
          en: 'A swarm of {w} chewed through the roots and opened a path underground!' }
      ]
    }
  ];

})(window);
