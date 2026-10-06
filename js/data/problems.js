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
 * ■ routeText：通ってきたルートで、問題文の最後に足す文（第3章）
 *     routeText: { sky: { ja: '…', en: '…' }, under: { ja: '…', en: '…' } }
 *
 * ■ 条件 any: true … どんな単語でも（辞書にある単語なら）当てはまる（最後の問題で使う）
 * ■ 条件に first: true … タグより先に調べる
 * ■ ending: 'feel' … 最後の問題で、気持ちエンドに進む
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
    },
    3: { ja: '第3章　黒板の出口', en: 'Chapter 3: The Way Out' }
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
        { cat: 'person', result: 'success', act: 'switchOn',
          ja: '「{w}」が来て、教室の電気をパチッとつけてくれた！',
          en: 'The {w} came by and flicked the classroom lights back on!' },
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
        { tag: 'big', result: 'success', act: 'bridge',
          ja: '大きな「{w}」が、ひび割れにすっぽりはまって、道になった！',
          en: 'The big {w} wedged neatly into the crack and became a path!' },
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
        { sub: 'magic', result: 'success', act: 'realCake',
          ja: '「{w}」！ ケーキの落書きが、本物のケーキになった！ いただきまーす！',
          en: '"{w}!" The cake doodle turned into a real cake! Time to eat!' },
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
      id: 'c2s1', chapter: 2, route: 'sky', scene: 'bounceCloud',
      title: { ja: 'はねる雲', en: 'The bouncy cloud' },
      text: {
        ja: '木のてっぺんから、雲の落書きに飛びうつった。…ぼよよーん！ この雲、トランポリンみたいで跳ねるのが止まらない！ このままじゃ、空のかなたへ飛んでいっちゃう！',
        en: 'You jumped from the treetop onto a cloud doodle... BOING! It\'s like a trampoline, and you can\'t stop bouncing! Keep this up and you\'ll fly off into the sky!'
      },
      rules: [
        { word: 'のり/糊/ぼんど/せっちゃくざい/接着剤/glue', result: 'success', act: 'glueStop',
          ja: '「{w}」を雲にぬったら、ぴたっ！ 足がくっついて、跳ねなくなった。べりっ、べりっ、と歩いて進んだ。',
          en: 'Spread the {w} on the cloud, and your feet stuck fast! No more bouncing. Peeled your way forward, step by step.' },
        { tag: 'heavy', result: 'success', act: 'weightStop',
          ja: '重い「{w}」をかかえたら、ずしん！ 跳ねるのが止まった。そのまま、しっかり歩いて進んだ。',
          en: 'Grabbed the heavy {w} and THUD! The bouncing stopped. Walked on with solid steps.' },
        { tag: 'soft', result: 'success', act: 'softLand',
          ja: 'やわらかい「{w}」を下にしいたら、ぼふっ！ はずみが止まった。',
          en: 'Laid the soft {w} down and landed on it with a FLUMP. The bouncing stopped!' },
        { tag: 'long', result: 'success', act: 'grabHold',
          ja: '長い「{w}」を、となりの雲の風見どりに引っかけて、つかまった！ たぐりよせて進んだ。',
          en: 'Hooked the long {w} onto the weathervane on the next cloud and held on tight! Pulled yourself along.' },
        { tag: 'fly', result: 'success', act: 'catchRide',
          ja: '跳ねたいきおいで「{w}」に飛び乗って、はねる雲からぬけだした！',
          en: 'Used a big bounce to leap onto the {w} and fly away from the bouncy cloud!' },
        { tag: 'sound', result: 'funny', act: 'bounceDance',
          ja: '「{w}」の音に合わせて、ぼよん、ぼよん。おどりながら跳ねて、そのまま先へ進んでいった！',
          en: 'Bounced along to the beat of the {w}, BOING, BOING, dancing all the way forward!' }
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
        { tag: 'big', result: 'success', act: 'bigScare',
          ja: '大きな「{w}」を見て、鳥たちは「でかっ！」とびっくり。飛んで逃げていった。',
          en: 'The birds saw the huge {w}, squawked "WHOA!", and flew off.' },
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
        { sub: 'vehicle', result: 'success', act: 'carSafe',
          ja: '「{w}」に乗りこんで、雷の中をつっきった！ 乗り物の中は、雷が落ちても安全なんだ。',
          en: 'Hopped in the {w} and drove through the storm! Inside a vehicle, you\'re safe from lightning.' },
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
        { word: 'せんぷうき/扇風機/うちわ/団扇/fan', result: 'success', act: 'blowBack',
          ja: '「{w}」で風をふきかえしたら、風の顔が目を回して、どこかへ飛んでいった！',
          en: 'Blew the wind right back with the {w}! The wind face got dizzy and drifted away!' },
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
        { sub: 'job', result: 'success', act: 'shiftChange',
          ja: '「{w}」が来て、門番と交代してくれた！ 新しい門番は、どうぞと通してくれた。',
          en: 'The {w} arrived to take over guard duty! The new guard waved you right in.' },
        { sub: 'toy', result: 'success', act: 'gift',
          ja: '「{w}」をわたしたら、門番は遊ぶのに夢中。門を開けて通してくれた！',
          en: 'Handed over the {w}. The guard got so into playing that he opened the gate!' },
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
      id: 'c2s6', chapter: 2, route: 'sky', scene: 'nightFork',
      title: { ja: '夜の分かれ道', en: 'The night crossroads' },
      text: {
        ja: '夜になった。雲の道が3つに分かれている。自由帳へ行けるのは、どの道…？ 道しるべがあるけど、暗くて読めない！',
        en: 'Night has fallen, and the cloud path splits three ways. Which one leads to the notebook? There\'s a signpost, but it\'s too dark to read!'
      },
      rules: [
        { word: 'こんぱす/らしんばん/羅針盤/ちず/地図/compass/map', result: 'success', act: 'readMap',
          ja: '「{w}」で調べたら、自由帳は上の道の先！ 迷わずに進んだ。',
          en: 'Checked the {w}: the notebook is up the top path! Off you went without a doubt.' },
        { tag: 'glow', result: 'success', act: 'lightSign',
          ja: '光る「{w}」で道しるべを照らしたら、「↑ 自由帳」と書いてあった！',
          en: 'Lit up the signpost with the glowing {w}. It said "↑ Notebook"!' },
        { sub: 'space', result: 'success', act: 'northStar',
          ja: '「{w}」が夜空で光って、進む方角を教えてくれた！ 上の道だ！',
          en: 'The {w} shone in the night sky and showed the way. The top path!' },
        { sub: 'bird', result: 'success', act: 'birdGuide',
          ja: '「{w}」が「こっちだよ」と、上の道へ案内してくれた！',
          en: 'The {w} chirped "This way!" and led you up the top path!' },
        { tag: 'sound', result: 'funny', act: 'echoPath',
          ja: '「{w}」と大声を出したら、上の道からだけ、やまびこが返ってきた。こっちだ！',
          en: 'You shouted "{w}!" and only the top path echoed back. That\'s the way!' }
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
        { tag: 'heavy', result: 'success', act: 'anchor',
          ja: '重い「{w}」を、いかりのようにぶら下げたら、流れ星がゆっくり下へ。無事に降りられた！',
          en: 'Hung the heavy {w} below like an anchor, and the shooting star slowly sank down. Safe landing!' },
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
        { tag: 'sound', result: 'success', act: 'moleScare',
          ja: '「{w}」の大きな音に、モグラたちはびっくり！ あわてて穴にもぐった。',
          en: 'The loud {w} startled the moles, and they ducked back into their holes!' },
        { tag: 'glow', result: 'success', act: 'glareMole',
          ja: 'まぶしい「{w}」に、モグラたちは「まぶしい〜！」とあわてて穴にもぐった！',
          en: 'The bright {w} made the moles cry "Too bright!" and dive back into their holes!' },
        { sub: 'weapon', first: true, result: 'success', act: 'whackMole',
          ja: '「{w}」でモグラたたき！ ポコポコッ！ モグラたちは目を回して、道をあけてくれた。',
          en: 'Whack-a-mole with the {w}! BONK BONK! The dizzy moles let you through.' },
        { tag: 'hard', first: true, result: 'success', act: 'whackMole',
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
      id: 'c2u2', chapter: 2, route: 'under', scene: 'flood',
      title: { ja: 'あふれる地下水', en: 'The rising water' },
      text: {
        ja: 'ザーザー…天井のひびから地下水がふき出して、水かさがどんどん上がってくる！ このままじゃ、流されてしまう！',
        en: 'Whoosh... water is gushing from a crack in the ceiling, and it\'s rising fast! You\'ll be swept away!'
      },
      rules: [
        { tag: 'swim', result: 'success', act: 'floatAway',
          ja: '「{w}」につかまって、水にぷかぷか浮かびながら、先へ進んだ！',
          en: 'Held onto the {w} and floated along on the water!' },
        { tag: 'cold', result: 'success', act: 'freezeFlood',
          ja: '冷たい「{w}」で、水がカチコチにこおった！ 氷の上を歩いて進んだ。',
          en: 'The cold {w} froze the water solid! Walked across the ice.' },
        { tag: 'hot', result: 'success', act: 'boilAway',
          ja: '熱い「{w}」で、あふれた水がぜんぶ湯気になった！',
          en: 'The hot {w} turned all the flood water into steam!' },
        { tag: 'big', result: 'success', act: 'plugLeak',
          ja: '大きな「{w}」で、水がふき出す天井のひびをふさいだ！ 水が引いて、歩いて進めた。',
          en: 'Plugged the gushing crack in the ceiling with the big {w}! The water drained away.' },
        { tag: 'fly', result: 'success', act: 'ride',
          ja: '「{w}」に乗って、水の上を飛びこえていった！',
          en: 'Rode the {w} right over the water!' },
        { cat: 'person', result: 'funny', act: 'bailFlood',
          ja: '「{w}」がバケツで水をくみ出し始めた！ …3時間後。水はすっかりなくなった。',
          en: 'The {w} started bailing out the water with a bucket! ...Three hours later, it was all gone.' },
        { sub: 'plant', result: 'funny', act: 'soakUp',
          ja: '「{w}」が水をぐんぐん吸って、ぐんぐん育った！ 水がなくなって、大きくなった「{w}」の横を通りぬけた。',
          en: 'The {w} soaked up all the water and grew huge! You walked on past the giant {w}.' }
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
        { word: 'こもりうた/子守唄/子守歌/lullaby', result: 'success', act: 'lullaby',
          ja: '「{w}」を小さな声で歌ったら、コウモリたちはもっとぐっすり。その間に通りぬけた。',
          en: 'Softly sang a {w}. The bats slept even deeper, and you slipped through.' },
        { sub: 'weapon', first: true, result: 'success', act: 'batsShoo',
          ja: '「{w}」をかまえて、しのび足で進んだ。目をさましたコウモリも、「{w}」を見て「ひえっ」と逃げていった！',
          en: 'Crept forward with the {w} at the ready. A bat woke up, took one look at the {w}, squeaked, and fled!' },
        { tag: 'soft', result: 'success', act: 'tiptoe',
          ja: 'やわらかい「{w}」を足の下にしいて、足音を立てずにそーっと通りぬけた。',
          en: 'Padded your feet with the soft {w} and crept through without a sound.' },
        { tag: 'small', result: 'success', act: 'guide',
          ja: '小さな「{w}」が先に立って道案内。ひそひそ声で、出口まで連れていってくれた。',
          en: 'The tiny {w} led the way, whispering, all the way to the exit.' },
        { tag: 'glow', result: 'fail', act: 'batsWake',
          ja: '「{w}」が光ったとたん、コウモリたちが目をさまして、バサバサバサ！ 入口まで追い返された…',
          en: 'The {w} lit up and the bats woke with a FLAP FLAP FLAP! They chased you all the way back...' },
        { tag: 'sound', result: 'fail', act: 'batsWake',
          ja: '「{w}」の音で、コウモリたちが目をさまして、バサバサバサ！ 入口まで追い返された…',
          en: 'The {w} made a noise and the bats woke with a FLAP FLAP FLAP! They chased you all the way back...' },
        { tag: 'fly', result: 'success', act: 'glideQuiet',
          ja: '「{w}」に乗って、音も立てずにすーっと通りぬけた。',
          en: 'Rode the {w} and glided through without a sound.' },
        { sub: 'time', result: 'funny', act: 'batsLeave',
          ja: '「{w}」と書いたら、コウモリたちは「もうそんな時間？」と、ぞろぞろ出かけていった。',
          en: 'You wrote "{w}", and the bats said "Is it that time already?" and filed out for the night.' }
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
        { sub: 'vehicle', result: 'success', act: 'dashThrough',
          ja: '「{w}」に乗って、岩が落ちてくる前に、びゅーんとかけぬけた！',
          en: 'Rode the {w} and zoomed through before the rocks could land!' },
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
        { tag: 'cold', result: 'success', act: 'hibernate',
          ja: '冷たい「{w}」で、ヘビはひんやり。そのまま冬眠してしまった。',
          en: 'The cold {w} chilled the snake, and it curled up for a winter nap.' },
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
        { sub: 'animal', result: 'success', act: 'huddle',
          ja: '「{w}」とぴったりくっついたら、あったか〜い！ いっしょに洞窟をぬけた。',
          en: 'Snuggled up close to the {w}. So warm! You got through the cave together.' },
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
    },

    // ============================================================
    //  第3章「黒板の出口」（14〜20問目・共通）：朝。日直が来た。黒板が消される前に自由帳へ
    // ============================================================

    // 14問目：チョークの粉の嵐
    {
      id: 'c3q1', chapter: 3, scene: 'dustStorm',
      title: { ja: 'チョークの粉の嵐', en: 'The chalk dust storm' },
      text: {
        ja: '朝だ！ 日直が窓のそばで、黒板消しをパンパンたたいている。チョークの粉の嵐がふきこんできた！ このままじゃ、粉にうもれてしまう！',
        en: 'Morning! The class monitor is clapping erasers by the window. A chalk dust storm is blowing in! You\'ll be buried in dust!'
      },
      routeText: {
        sky: { ja: '（空から降りてきたばかりなのに…！）', en: '(You only just got down from the sky...!)' },
        under: { ja: '（地下から出てきたばかりなのに…！）', en: '(You only just climbed out from underground...!)' }
      },
      rules: [
        { word: 'かさ/傘/あまがさ/umbrella', result: 'success', act: 'umbrellaDust',
          ja: '「{w}」をさしたら、粉はぜんぶはじかれた！ そのまま歩いて進んだ。',
          en: 'Opened the {w}, and all the dust bounced off! Walked right on.' },
        { word: 'そうじき/掃除機/vacuum cleaner/vacuum', result: 'success', act: 'vacuumDust',
          ja: '「{w}」が、ゴオオオッ！と粉をぜんぶ吸いこんだ！',
          en: 'The {w} went VRRRRM and sucked up every last speck!' },
        { word: 'みず/水/あめ/雨/おおあめ/大雨/こさめ/小雨/ゆうだち/夕立/water/rain', result: 'success', act: 'wetDust',
          ja: '「{w}」で粉がしめって、嵐がしずまった！',
          en: 'The {w} dampened the dust, and the storm died down!' },
        { tag: 'big', result: 'success', act: 'dustWall',
          ja: '大きな「{w}」を風よけにして、粉の嵐がおさまるのを待った。',
          en: 'Hid behind the big {w} until the dust storm passed.' },
        { tag: 'fly', result: 'success', act: 'ride',
          ja: '「{w}」に乗って、粉の嵐の上を飛んでいった！',
          en: 'Rode the {w} right over the dust storm!' },
        { sub: 'bird', first: true, result: 'funny', act: 'dustBath',
          ja: '「{w}」が粉の中で、ぱたぱた砂あびを始めた。気持ちよさそう…。粉はぜんぶ「{w}」があびてしまった！',
          en: 'The {w} started taking a dust bath, flapping happily... and soaked up all the dust!' }
      ]
    },

    // 15問目：落書きモンスター
    {
      id: 'c3q2', chapter: 3, scene: 'monster',
      title: { ja: '落書きモンスター', en: 'The scribble monster' },
      text: {
        ja: '粉をかぶった黒板のすみの、ぐちゃぐちゃの落書きが、むくむく起き上がった！ 落書きモンスターだ！「ぜんぶ、ぐちゃぐちゃにしてやる〜！」',
        en: 'A tangled scribble in the corner, covered in dust, rises up! It\'s a scribble monster! "I\'ll scribble EVERYTHING into a mess!"'
      },
      routeText: {
        sky: { ja: '空の雲をまきこんだ、もくもくの体で、せまってくる！', en: 'Its fluffy body is full of sky clouds, and it\'s coming at you!' },
        under: { ja: '地下の土をまきこんだ、ごつごつの体で、せまってくる！', en: 'Its lumpy body is full of underground dirt, and it\'s coming at you!' }
      },
      rules: [
        { word: 'けしごむ/消しゴム/eraser/rubber', first: true, result: 'success', act: 'eraseMonster',
          ja: '「{w}」でごしごし！ モンスターのぐちゃぐちゃの線が、きれいに消えていった。',
          en: 'Scrub scrub with the {w}! The monster\'s tangled lines rubbed away clean.' },
        { sub: 'weapon', first: true, result: 'success', act: 'slashMonster',
          ja: '「{w}」でえいっ！ モンスターの線がほどけて、小さな落書きにもどった。',
          en: 'Took a swing with the {w}! The monster\'s lines came undone, and it turned back into a tiny doodle.' },
        { tag: 'heavy', result: 'success', act: 'squashMonster',
          ja: '重い「{w}」を上から落としたら、モンスターはぺしゃんこ！',
          en: 'Dropped the heavy {w} on top, and the monster went SPLAT!' },
        { sub: 'magic', result: 'success', act: 'shrinkMonster',
          ja: '「{w}」！ モンスターはみるみる小さくなって、かわいい落書きになった。',
          en: '"{w}!" The monster shrank and shrank into a cute little doodle.' },
        { sub: 'people', result: 'funny', act: 'scoldMonster',
          ja: '「{w}」に「こらっ！ 夜ふかししないで、もう寝なさい！」と、しかられて、モンスターはしょんぼり寝てしまった。',
          en: 'The {w} scolded it: "Hey! Stop staying up late and go to bed!" The monster sulked off to sleep.' }
      ]
    },

    // 16問目：先生の赤ペンのバツ印
    {
      id: 'c3q3', chapter: 3, scene: 'redX',
      title: { ja: '赤ペンのバツ印', en: 'The red X' },
      text: {
        ja: '先生の赤ペンの、大きなバツ印が道をふさいでいる！「まちがい！」とでも言いたそう…。バツの線にさわると、ビシッとはじき返される！',
        en: 'A giant red X from the teacher\'s pen blocks the way! It seems to be saying "WRONG!"... Touch its lines and you get bounced right back!'
      },
      rules: [
        { word: 'まる/丸/まるじるし/丸印/はなまる/花丸/ひゃくてん/百点/100点/まんてん/満点/ごうかく/合格/せいかい/正解/circle mark/check mark/gold star/perfect score/correct answer', result: 'success', act: 'turnCircle',
          ja: '「{w}」と書いたら、バツ印がくるっと「まる」に変わった！ まるの中をくぐって通りぬけた。',
          en: 'You wrote "{w}", and the X spun around into a big circle! Walked right through the middle.' },
        { word: 'けしごむ/消しゴム/eraser/rubber', result: 'success', act: 'eraseX',
          ja: '「{w}」で、バツ印をごしごし消した！',
          en: 'Rubbed the X away with the {w}!' },
        { tag: 'small', result: 'success', act: 'slipX',
          ja: '小さな「{w}」のあとについて、バツの足のあいだの、小さなすき間をくぐりぬけた！',
          en: 'Followed the tiny {w} through the little gap between the legs of the X!' },
        { tag: 'fly', result: 'success', act: 'flyOverX',
          ja: '「{w}」に乗って、バツ印の上を飛びこえた！',
          en: 'Rode the {w} right over the top of the X!' },
        { word: 'せんせい/先生/たんにん/担任/teacher/homeroom teacher', result: 'funny', act: 'teacherFix',
          ja: '「{w}」がやって来て、バツ印を見て「あら、まちがえた」。赤ペンで、はなまるに書き直してくれた！',
          en: 'The {w} came by, looked at the X, and said "Oops, my mistake." Then redrew it as a big gold star!' }
      ]
    },

    // 17問目：時計の針が進む
    {
      id: 'c3q4', chapter: 3, scene: 'clock',
      title: { ja: '進む時計の針', en: 'The ticking clock' },
      text: {
        ja: 'カチ、カチ…黒板の上の時計が、もうすぐ8時！ 8時になったら、日直が黒板を消しはじめる！ 時計の針を止めたい！',
        en: 'Tick, tock... the clock above the board is almost at 8! At 8 o\'clock, the monitor starts erasing the board! Stop the clock hands!'
      },
      rules: [
        { tag: 'heavy', result: 'success', act: 'hangWeight',
          ja: '重い「{w}」を長い針にぶら下げたら、針が重くて動かなくなった！',
          en: 'Hung the heavy {w} on the minute hand, and it was too heavy to move!' },
        { tag: 'long', result: 'success', act: 'jamHands',
          ja: '長い「{w}」を、時計の針のあいだにつっかえ棒にした！ 針が止まった。',
          en: 'Wedged the long {w} between the clock hands like a doorstop! They stopped.' },
        { sub: 'time', result: 'success', act: 'rewind',
          ja: '「{w}」と書いたら、時計の針がくるくるくる…と、うしろにもどった！',
          en: 'You wrote "{w}", and the clock hands spun backward, whirr whirr whirr!' },
        { sub: 'magic', result: 'success', act: 'freezeClock',
          ja: '「{w}」！ 時計がこおりついたみたいに、ぴたっと止まった。',
          en: '"{w}!" The clock froze solid and stopped dead.' },
        { sub: 'bird', result: 'funny', act: 'cuckoo',
          ja: '「{w}」が時計の中に住みついて、はと時計になった！ ポッポー、ポッポー…鳴いているあいだは、針が止まっている。',
          en: 'The {w} moved into the clock and turned it into a cuckoo clock! Cuckoo, cuckoo... the hands stop while it sings.' }
      ]
    },

    // 18問目：黒板消しがせまってくる
    {
      id: 'c3q5', chapter: 3, scene: 'eraserCome',
      title: { ja: 'せまる黒板消し', en: 'Here comes the eraser' },
      text: {
        ja: '日直が黒板消しを持った！ 左のはしから、ザーッ、ザーッと、落書きが消されていく。黒板消しが、こっちへせまってくる！',
        en: 'The monitor picked up the eraser! Swish, swish, the doodles are being wiped away from the left. The eraser is heading your way!'
      },
      rules: [
        { word: 'のり/糊/ぼんど/せっちゃくざい/接着剤/glue/superglue', result: 'success', act: 'glueEraser',
          ja: '「{w}」を黒板にぬったら、黒板消しがベタッとくっついて、動けなくなった！',
          en: 'Spread the {w} on the board, and the eraser got stuck fast! It can\'t move!' },
        { tag: 'hard', result: 'success', act: 'hardBlock',
          ja: 'かたい「{w}」は、黒板消しでも消せない！ そのかげにかくれて、やりすごした。',
          en: 'The hard {w} can\'t be erased! You hid behind it until the eraser passed.' },
        { tag: 'small', result: 'success', act: 'hideCorner',
          ja: '小さな「{w}」が、黒板のすみの小さなすき間を見つけた！ 黒板消しの届かないところに、かくれた。',
          en: 'The tiny {w} found a little gap in the corner of the board, out of the eraser\'s reach! You hid there.' },
        { tag: 'fly', result: 'success', act: 'escapeFly',
          ja: '「{w}」に乗って、黒板消しの届かない、黒板のいちばん上へ逃げた！',
          en: 'Rode the {w} up to the very top of the board, out of the eraser\'s reach!' },
        { tag: 'cute', result: 'funny', act: 'tooCute',
          ja: '黒板消しが「{w}」の前で、ぴたっ。…かわいすぎて、消せない！ 黒板消しは、そっと帰っていった。',
          en: 'The eraser stopped dead in front of the {w}... too cute to erase! It quietly went away.' }
      ]
    },

    // 19問目：出口の扉に鍵がかかっている
    {
      id: 'c3q6', chapter: 3, scene: 'door',
      title: { ja: '鍵のかかった扉', en: 'The locked door' },
      text: {
        ja: '黒板のはしに、出口の扉！ 自由帳は、この向こうだ。…ガチャガチャ。鍵がかかっている！',
        en: 'An exit door at the edge of the board! The notebook is just beyond it... rattle rattle. It\'s locked!'
      },
      rules: [
        { word: 'かぎ/鍵/key', result: 'success', act: 'unlock',
          ja: '「{w}」をさしこんで、カチャッ！ 扉が開いた！',
          en: 'Put the {w} in the lock... CLICK! The door opened!' },
        { tag: 'small', result: 'success', act: 'keyhole',
          ja: '小さな「{w}」といっしょに、鍵穴をくぐりぬけた！',
          en: 'Squeezed through the keyhole along with the tiny {w}!' },
        { sub: 'magic', result: 'success', act: 'magicOpen',
          ja: '「{w}」！ 扉がひとりでに、ギギーッと開いた！',
          en: '"{w}!" The door creaked open all by itself!' },
        { sub: 'weapon', result: 'success', act: 'breakDoor',
          ja: '「{w}」で、扉をバキッとこわした！',
          en: 'Smashed the door open with the {w}! CRACK!' },
        { tag: 'sound', result: 'funny', act: 'knock',
          ja: '「{w}」でコンコン。「はーい」と、扉の向こうから開けてくれた！ …だれ？',
          en: 'Knock knock with the {w}... "Coming!" Someone opened it from the other side! ...Who was that?' }
      ]
    },

    // 20問目：最後に一言
    {
      id: 'c3q7', chapter: 3, scene: 'finale', last: true,
      title: { ja: '最後に一言', en: 'One last word' },
      text: {
        ja: '自由帳が見えた！ ページが開いて、待っている。…でも、その前に。この棒人間を描いてくれた子に、最後に何か伝えたい。黒板に、一言だけ書き残そう。',
        en: 'There\'s the notebook, open and waiting! ...But first. You want to leave one last message for the kid who drew you. Write just one word on the board.'
      },
      rules: [
        { sub: 'feeling', result: 'success', act: 'lastFeeling', ending: 'feel',
          ja: '黒板に、大きく「{w}」と書いた。…きっと、伝わる。',
          en: 'You wrote "{w}" big across the board... It\'ll get through.' },
        { any: true, result: 'success', act: 'lastWord',
          ja: '黒板に「{w}」と書き残した。描いてくれた子への、おみやげだ。',
          en: 'You left "{w}" on the board, a little gift for the kid who drew you.' }
      ]
    }
  ];

})(window);
