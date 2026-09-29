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
 * ■ 問題の route：第2章のように、ルートごとに別の問題にするときは、問題そのものに route: 'sky' / 'under' を書く
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
    1: { ja: '第1章　落書きだらけの黒板', en: 'Chapter 1: A Board Full of Doodles' },
    // 第2章はルートで名前が変わる（sky＝空ルート／under＝地下ルート）
    2: {
      sky: { ja: '第2章　空の落書き', en: 'Chapter 2: Sky Doodles' },
      under: { ja: '第2章　地下の落書き', en: 'Chapter 2: Underground Doodles' }
    }
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
    },

    // ============================================================
    //  第2章・空ルート（7〜13問目）：黒板の上のほうに描かれた、空の落書き
    // ============================================================

    // 7問目：雲の上を歩きたい（雲はふわふわの絵なので、足が沈む）
    {
      id: 'c2s1', chapter: 2, route: 'sky', scene: 'cloudWalk',
      title: { ja: '雲の上を歩きたい', en: 'Walking on clouds' },
      text: {
        ja: '木のてっぺんから、雲の落書きの上に出た！ でも雲はふわふわの絵。足がずぶずぶ沈んでいく…！ 向こうの雲まで行きたい。',
        en: 'From the treetop, you reach the cloud doodles! But clouds are just fluffy drawings, and your feet are sinking! Get to the next cloud.'
      },
      rules: [
        { tag: 'soft', result: 'success', act: 'cloudCarpet',
          ja: 'やわらかい「{w}」を雲から雲へふわっとかけたら、沈まないじゅうたんになった！ その上を歩いて渡った。',
          en: 'Laid the soft {w} from cloud to cloud, and it became a carpet that didn\'t sink! Walked right across.' },
        { tag: 'long', result: 'success', act: 'cloudExtend',
          ja: '長い「{w}」を向こうの雲までのばして、その上を渡った！',
          en: 'Stretched the long {w} over to the next cloud and walked across it!' },
        { tag: 'fly', result: 'success', act: 'cloudRide',
          ja: '「{w}」に乗って、ふわりと向こうの雲へ飛んでいった！',
          en: 'Hopped on the {w} and floated over to the next cloud!' },
        { sub: 'sweets', result: 'funny', act: 'cottonCandy',
          ja: '「{w}」を雲にのせたら、雲があまいわたあめに変わって、ふくらんで向こうの雲とくっついた！ つまみ食いしながら渡った。',
          en: 'Put the {w} on the cloud, and it turned into sweet cotton candy, puffed up, and joined the next cloud! Snacked all the way across.' }
      ]
    },

    // 8問目：鳥の群れ
    {
      id: 'c2s2', chapter: 2, route: 'sky', scene: 'birds',
      title: { ja: '鳥の落書きの群れ', en: 'A flock of bird doodles' },
      text: {
        ja: '雲の上を進むと、鳥の落書きの群れ！ 「ここはぼくらの空だ！」と、つっつきに飛んでくる！',
        en: 'Along the clouds comes a flock of bird doodles! "This is OUR sky!" They swoop in to peck!'
      },
      rules: [
        { tag: 'sound', result: 'success', act: 'scatterBirds',
          ja: '「{w}」の大きな音に、鳥たちはびっくり！ ちりぢりに飛んでいった。',
          en: 'The {w} made such a racket that the birds scattered in every direction!' },
        { tag: 'edible', result: 'success', act: 'feedBirds',
          ja: '「{w}」をうしろへ投げたら、鳥たちはそっちへまっしぐら。そのすきに通りぬけた！',
          en: 'Tossed the {w} behind, and the whole flock dove for it. Slipped right past!' },
        { tag: 'hard', result: 'success', act: 'shieldBirds',
          ja: 'かたい「{w}」を盾にしたら、鳥たちはコツン！とぶつかって、目を回して逃げていった。',
          en: 'Held up the hard {w} like a shield. The birds went BONK, got dizzy, and flew off!' },
        { sub: 'bird', result: 'funny', act: 'birdLeader',
          ja: '「{w}」が群れのリーダーになって、みんなを連れてどこかへ飛んでいってしまった！',
          en: 'The {w} became the leader of the flock and flew away with all of them!' }
      ]
    },

    // 9問目：雷
    {
      id: 'c2s3', chapter: 2, route: 'sky', scene: 'thunder',
      title: { ja: '雷雲の落書き', en: 'A thundercloud doodle' },
      text: {
        ja: 'ゴロゴロ…ピカッ！ 怒った顔の雷雲の落書きが、あちこちに雷を落としてくる！ このままじゃ進めない。',
        en: 'Rumble... FLASH! A grumpy thundercloud doodle is throwing lightning everywhere! You can\'t go on like this.'
      },
      rules: [
        { tag: 'long', result: 'success', act: 'lightningRod',
          ja: '長い「{w}」を立てたら、雷がぜんぶそっちに落ちた！ そのすきに通りぬけた。',
          en: 'Stood the long {w} up, and every bolt struck it instead! Walked on through.' },
        { tag: 'fly', result: 'success', act: 'ride',
          ja: '「{w}」に乗って、雷より速くかけぬけた！',
          en: 'Rode the {w} and zipped past faster than lightning!' },
        { sub: 'building', result: 'success', act: 'hideIn',
          ja: '「{w}」の中に入って、雷がやむまで待った。雷雲が行ってしまってから、また歩きだした。',
          en: 'Waited inside the {w} until the storm passed, then set off again.' },
        { sub: 'drink', result: 'funny', act: 'cloudDrink',
          ja: '雷雲が「{w}」をごくごく飲んで、おなかいっぱい。ぐうぐう寝てしまった！',
          en: 'The thundercloud gulped down the {w}, got full, and fell fast asleep!' }
      ]
    },

    // 10問目：強い風
    {
      id: 'c2s4', chapter: 2, route: 'sky', scene: 'wind',
      title: { ja: '向かい風', en: 'Headwind' },
      text: {
        ja: 'びゅうううう！ 風の落書きが、向かい風になってふきつける。飛ばされそうで、前に進めない！',
        en: 'WHOOOOSH! The wind doodles are blowing straight at you. You\'ll get blown away!'
      },
      rules: [
        { tag: 'heavy', result: 'success', act: 'pushHeavy',
          ja: '重い「{w}」を風よけにして、ずりずり押しながら進んだ！',
          en: 'Used the heavy {w} as a windbreak and shoved it forward, step by step!' },
        { tag: 'long', result: 'success', act: 'ropePull',
          ja: '長い「{w}」を向こうまでのばして、つかまりながら進んだ！',
          en: 'Stretched the long {w} ahead and pulled along it hand over hand!' },
        { sub: 'weather', result: 'funny', act: 'windFight',
          ja: '「{w}」と風がけんかを始めた！ ドタバタしているすきに、こっそり通りぬけた。',
          en: 'The {w} and the wind got into a fight! Tiptoed past while they scuffled.' }
      ]
    },

    // 11問目：空の城の門番
    {
      id: 'c2s5', chapter: 2, route: 'sky', scene: 'castle',
      title: { ja: '空の城の門番', en: 'The sky castle guard' },
      text: {
        ja: '雲の上に、お城の落書き！ でも門の前で、門番が「通りたければ、何かよこせ！」と通せんぼしている。',
        en: 'A castle doodle on the clouds! But the guard blocks the gate: "Want in? Then hand something over!"'
      },
      rules: [
        { cat: 'food', result: 'success', act: 'gift',
          ja: '「{w}」をわたしたら、門番はニコニコ。門を開けて通してくれた！',
          en: 'Handed over the {w}. The guard grinned and opened the gate!' },
        { sub: 'magic', result: 'success', act: 'openSesame',
          ja: '「{w}」ととなえたら、門がひとりでにギギーッと開いた！ 門番もびっくり。',
          en: 'Said "{w}!" and the gate creaked open all by itself! Even the guard was stunned.' },
        { sub: 'animal', result: 'funny', act: 'guardPet',
          ja: '門番が「{w}」にメロメロ！ なでなでに夢中で、門のことを忘れてしまった。',
          en: 'The guard fell head over heels for the {w}! Too busy petting it to guard the gate.' }
      ]
    },

    // 12問目：夜になる（ねむくなる）
    {
      id: 'c2s6', chapter: 2, route: 'sky', scene: 'night',
      title: { ja: '夜になった', en: 'Nightfall' },
      text: {
        ja: '空がだんだん暗くなって、夜になった。月と星の落書きがまたたいて…ふわぁ。ねむくて、立ったまま寝てしまいそう…',
        en: 'The sky grows dark. Night falls. The moon and star doodles twinkle... *yawn*. So sleepy... might doze off standing up...'
      },
      rules: [
        { tag: 'sound', result: 'success', act: 'wakeUp',
          ja: '「{w}」の音で、ぱっちり目がさめた！ 夜の雲の上を、元気に歩きだした。',
          en: 'The {w} was so loud you snapped wide awake! Off across the night clouds!' },
        { tag: 'soft', result: 'success', act: 'nap',
          ja: 'やわらかい「{w}」でぐっすり眠ったら、朝になった！ 元気いっぱいで出発。',
          en: 'Slept soundly on the soft {w} until morning! Off you go, full of energy.' },
        { sub: 'drink', result: 'success', act: 'drinkWake',
          ja: '「{w}」を飲んだら、目がぱっちり！ 夜の雲の上を歩きだした。',
          en: 'Drank the {w} and felt wide awake! Off across the night clouds.' },
        { sub: 'animal', result: 'funny', act: 'countSheep',
          ja: '「{w}」を数えていたら…1ぴき、2ひき…数えるのが楽しくなって、目がさえてしまった！',
          en: 'Started counting {w}s... one, two... it got so fun you ended up wide awake!' }
      ]
    },

    // 13問目：流れ星から降りる
    {
      id: 'c2s7', chapter: 2, route: 'sky', scene: 'shootingStar',
      title: { ja: '流れ星から降りたい', en: 'Off the shooting star' },
      text: {
        ja: '星の落書きにつかまったら…それは流れ星だった！ びゅーん！ このままじゃ黒板のはしにぶつかる！ 下へ降りたい。',
        en: 'You grabbed a star doodle... but it\'s a shooting star! ZOOM! You\'ll crash into the edge of the board! Get down!'
      },
      rules: [
        { tag: 'soft', result: 'success', act: 'starCushion',
          ja: 'やわらかい「{w}」を下に置いて、えいっと飛びおりた。ぼよーん！ 無事に着地！',
          en: 'Dropped the soft {w} below and jumped. BOING! A safe landing!' },
        { tag: 'fly', result: 'success', act: 'starHop',
          ja: '「{w}」に乗りかえて、流れ星からゆっくり降りた！',
          en: 'Switched over to the {w} and floated gently down!' },
        { tag: 'long', result: 'success', act: 'starRope',
          ja: '長い「{w}」を下までたらして、するする降りた！',
          en: 'Dangled the long {w} all the way down and slid to the ground!' },
        { sub: 'feeling', result: 'funny', act: 'starWish',
          ja: '流れ星に「{w}」とお願いしたら…流れ星がにっこり止まって、下までそっと送ってくれた！',
          en: 'Made a wish on the shooting star: "{w}"... It smiled, stopped, and gently set you down!' }
      ]
    },

    // ============================================================
    //  第2章・地下ルート（7〜13問目）：地面の線の下に描かれた、地下の落書き
    // ============================================================

    // 7問目：モグラ
    {
      id: 'c2u1', chapter: 2, route: 'under', scene: 'mole',
      title: { ja: 'モグラの通せんぼ', en: 'Moles in the way' },
      text: {
        ja: '根っこの下は、モグラの落書きのトンネル！ モグラたちがあちこちの穴から顔を出して「ここはぼくらの道！」と通せんぼ。',
        en: 'Under the roots are mole doodle tunnels! Moles pop out of every hole: "This is OUR tunnel!"'
      },
      rules: [
        { tag: 'glow', result: 'success', act: 'glareMole',
          ja: 'まぶしい「{w}」に、モグラたちは「まぶしい〜！」とあわてて穴にもぐった！',
          en: 'The bright {w} made the moles cry "Too bright!" and dive back into their holes!' },
        { tag: 'hard', result: 'success', act: 'whackMole',
          ja: 'かたい「{w}」でモグラたたき！ ポコポコッ！ モグラたちは目を回して、道をあけてくれた。',
          en: 'Whack-a-mole with the hard {w}! BONK BONK! The dizzy moles let you through.' },
        { tag: 'edible', result: 'success', act: 'moleFeed',
          ja: '「{w}」をころがしたら、モグラたちは大よろこびで取り合いを始めた。そのすきに通りぬけた！',
          en: 'Rolled the {w} over, and the moles scrambled for it. Slipped right past!' },
        { sub: 'bug', result: 'funny', act: 'moleChase',
          ja: '「{w}」を見たモグラたちが大こうふん！ 「ごちそうだ〜！」と追いかけて行ってしまった。',
          en: 'The moles went wild for the {w}! "Dinner!" They chased it off and left the way clear.' }
      ]
    },

    // 8問目：地下水の川
    {
      id: 'c2u2', chapter: 2, route: 'under', scene: 'river',
      title: { ja: '地下の川', en: 'The underground river' },
      text: {
        ja: 'ザーザー…地下水の川の落書き！ 流れが速くて、このままじゃ渡れない。',
        en: 'Whoosh... an underground river doodle! The current\'s too fast to cross.'
      },
      rules: [
        { tag: 'swim', result: 'success', act: 'boatCross',
          ja: '「{w}」に乗って、流れにのりながら向こう岸へ渡った！',
          en: 'Rode the {w} with the current all the way to the other bank!' },
        { tag: 'cold', result: 'success', act: 'freezeRiver',
          ja: '冷たい「{w}」で川がカチコチにこおった！ 氷の上をつるつる歩いて渡った。',
          en: 'The cold {w} froze the river solid! Slid across the ice.' },
        { tag: 'long', result: 'success', act: 'extend',
          ja: '長い「{w}」を向こう岸までのばして、その上を渡った！',
          en: 'Stretched the long {w} to the far bank and walked across!' },
        { cat: 'person', result: 'funny', act: 'bailOut',
          ja: '「{w}」がバケツで川の水をくみ出し始めた！ …3時間後。川はからっぽになって、歩いて渡れた。',
          en: 'The {w} started bailing out the river with a bucket! ...Three hours later, it was empty. Walked right across.' }
      ]
    },

    // 9問目：真っ暗な洞窟（コウモリを起こさないように）
    {
      id: 'c2u3', chapter: 2, route: 'under', scene: 'bats',
      title: { ja: 'コウモリの洞窟', en: 'The bat cave' },
      text: {
        ja: '真っ暗な洞窟。天井には、コウモリの落書きがびっしり…。光ったり音を立てたりしたら、起きてしまいそう！ そーっと通りたい。',
        en: 'A pitch-dark cave, its ceiling packed with bat doodles... Any light or noise might wake them! Sneak through quietly.'
      },
      rules: [
        { tag: 'soft', result: 'success', act: 'tiptoe',
          ja: 'やわらかい「{w}」を足の下にしいて、足音を立てずにそーっと通りぬけた。',
          en: 'Padded your feet with the soft {w} and crept through without a sound.' },
        { tag: 'small', result: 'success', act: 'guide',
          ja: '小さな「{w}」が先に立って道案内。ひそひそ声で、出口まで連れていってくれた。',
          en: 'The tiny {w} led the way, whispering, all the way to the exit.' },
        { tag: 'glow', result: 'funny', act: 'batsFly',
          ja: '「{w}」が光ったとたん、コウモリたちが目をさまして、バサバサバサ！ …でも、飛んでいった先に出口が見えた！',
          en: 'The {w} lit up and the bats woke with a FLAP FLAP FLAP! ...But where they flew, you spotted the exit!' },
        { tag: 'sound', result: 'funny', act: 'batsSing',
          ja: '「{w}」の音でコウモリたちが起きて…いっしょに歌いだした！ 大合唱のなかを通りぬけた。',
          en: 'The {w} woke the bats... and they started singing along! Walked through the big chorus.' }
      ]
    },

    // 10問目：落石
    {
      id: 'c2u4', chapter: 2, route: 'under', scene: 'rockfall',
      title: { ja: '落石注意', en: 'Falling rocks' },
      text: {
        ja: 'ゴゴゴ…洞窟の天井から、岩の落書きがガラガラ落ちてくる！ 頭の上があぶない！',
        en: 'Rumble... rock doodles are crashing down from the cave ceiling! Watch your head!'
      },
      rules: [
        { tag: 'hard', result: 'success', act: 'helmet',
          ja: 'かたい「{w}」をヘルメットにして、落ちてくる岩をカキーン！とはね返しながら進んだ。',
          en: 'Wore the hard {w} as a helmet and CLANGED the rocks away as you went!' },
        { tag: 'big', result: 'success', act: 'roof',
          ja: '大きな「{w}」を屋根にして、その下をくぐりぬけた！',
          en: 'Put the big {w} up as a roof and walked safely underneath!' },
        { cat: 'person', result: 'funny', act: 'juggle',
          ja: '「{w}」が落ちてくる岩をキャッチして、ジャグリングを始めた！ 拍手しながら通りぬけた。',
          en: 'The {w} caught the falling rocks and started juggling them! Walked past, clapping.' }
      ]
    },

    // 11問目：宝箱の番人
    {
      id: 'c2u5', chapter: 2, route: 'under', scene: 'snake',
      title: { ja: '宝箱の番人', en: 'The treasure guard' },
      text: {
        ja: 'だれかが描いた宝の地図の落書き！ ×印の宝箱に、ヘビの落書きがまきついて「シャーッ！」 通してくれない。',
        en: 'Someone\'s treasure map doodle! A snake doodle is coiled around the chest at the X. "HISSSS!" It won\'t let you pass.'
      },
      rules: [
        { tag: 'sound', result: 'success', act: 'snakeCharm',
          ja: '「{w}」の音色に、ヘビはうっとり。ゆらゆら踊っているうちに、通りぬけた！',
          en: 'The sound of the {w} put the snake in a trance. It swayed along while you slipped by!' },
        { tag: 'edible', result: 'success', act: 'snakeGulp',
          ja: 'ヘビは「{w}」をまるのみ！ おなかがふくれて、ぐうぐう眠ってしまった。',
          en: 'The snake swallowed the {w} whole! With a full belly, it dozed right off.' },
        { tag: 'long', result: 'funny', act: 'snakeFriend',
          ja: '長い「{w}」を見たヘビが、仲間だと思って大よろこび。からまって、ほどけなくなってしまった…そのすきに通りぬけた。',
          en: 'The snake thought the long {w} was a new friend! They got so tangled up they couldn\'t get loose... so you walked on by.' }
      ]
    },

    // 12問目：凍える洞窟
    {
      id: 'c2u6', chapter: 2, route: 'under', scene: 'iceCave',
      title: { ja: '氷の洞窟', en: 'The ice cave' },
      text: {
        ja: 'ヒュオオ…氷の洞窟の落書き。つららがいっぱいで、とっても寒い！ このままじゃ、こおりついて動けなくなる！',
        en: 'Brrr... an ice cave doodle, full of icicles. It\'s freezing! You\'ll turn into a chalk popsicle!'
      },
      rules: [
        { tag: 'hot', result: 'success', act: 'warmUp',
          ja: '熱い「{w}」であたたまって、ぽかぽか！ つららもとけて、元気に歩きだした。',
          en: 'Warmed up by the hot {w}! The icicles melted too, and off you went.' },
        { tag: 'soft', result: 'success', act: 'wrapUp',
          ja: 'やわらかい「{w}」にくるまって、ぬくぬく。寒さもへっちゃらで通りぬけた！',
          en: 'Bundled up in the soft {w}, toasty warm, and strolled right through!' },
        { tag: 'cold', result: 'funny', act: 'iceSlip',
          ja: '冷たい「{w}」で、ますます寒く…床がつるつるにこおって、すってーん！ そのまま洞窟の外まですべっていった。',
          en: 'The cold {w} made it even colder... the floor iced over, and WHOOPS! Slid all the way out of the cave.' }
      ]
    },

    // 13問目：地上へ出る
    {
      id: 'c2u7', chapter: 2, route: 'under', scene: 'surface',
      title: { ja: '地上への出口', en: 'The way up' },
      text: {
        ja: '上から光がさしこんでいる！ 地上への出口だ。でも、穴はずっと上。土の壁はぽろぽろで、のぼれない！',
        en: 'Light is shining down from above! It\'s the way out. But the hole is way up high, and the crumbly walls can\'t be climbed!'
      },
      rules: [
        { tag: 'long', result: 'success', act: 'ladderUp',
          ja: '長い「{w}」を穴に立てかけて、地上までのぼった！',
          en: 'Stood the long {w} up in the shaft and climbed to the surface!' },
        { tag: 'fly', result: 'success', act: 'flyOut',
          ja: '「{w}」に乗って、光の方へ飛んでいった！',
          en: 'Rode the {w} up toward the light!' },
        { tag: 'big', result: 'success', act: 'growUp',
          ja: '「{w}」に乗ったら、ぐんぐん大きくなって、地上まで持ち上げてくれた！',
          en: 'Stood on the {w}, and it grew and grew until it lifted you to the surface!' },
        { sub: 'plant', result: 'funny', act: 'sprout',
          ja: '「{w}」を植えたら、にょきにょき育って、棒人間ごと地上へ持ち上げた！',
          en: 'Planted the {w}, and it sprouted up so fast it carried you to the surface!' }
      ]
    }
  ];

})(window);
