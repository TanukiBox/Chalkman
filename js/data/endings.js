/*
 * ============================================================
 *  CHALK MAN エンディング（8種類）
 * ============================================================
 *
 * ■ 決まる順番（上が優先）
 *   8 黒板消し（チョーク0でゲームオーバー）
 *   7 隠しエンド（珍回答が10回以上）
 *   5・6 気持ちエンド（20問目で「気持ち」の単語で成功）
 *   1〜4 ルートのエンディング（空・地下）
 *   5・6 と 1〜4 は、チョークの残りが 60 以上かどうかで分かれる（js/game/config.js の ENDING_CHALK）
 *
 * ■ 1つのエンディング
 *   title：名前　text：文章　hint：まだ見ていないときに出すヒント（エンディング回収画面で使う）
 *   routeText：通ってきたルートで、文章の頭に足す文（気持ちエンド）
 *   {w} には、20問目で書いた単語がそのまま入る。
 */
(function (global) {
  'use strict';
  var CM = global.CM = global.CM || {};

  CM.ENDINGS = {
    1: {
      title: { ja: '空からの自由帳', en: 'A Notebook Full of Sky' },
      text: {
        ja: '棒人間は、自由帳のページにぴょんと飛びこんだ。朝、自由帳を開いた子はびっくり！ ページには、元気な棒人間と、空で出会った雲や鳥や星の絵が、いっぱい描かれていた。',
        en: 'The stickman leapt into the notebook. In the morning, the kid who opened it was amazed! The page was full of a cheerful stickman and the clouds, birds, and stars from the sky.'
      },
      hint: { ja: '空ルートで、チョークをたくさん残して自由帳へ', en: 'Reach the notebook by the Sky Route with plenty of chalk left' }
    },
    2: {
      title: { ja: 'かすれた空の旅', en: 'A Faded Trip Through the Sky' },
      text: {
        ja: 'チョークがほとんどなくなって、棒人間はうすくかすれていた。それでも、自由帳のすみの小さな雲によりかかって、すやすや眠った。…またいつか、描き足してもらえるかな。',
        en: 'Almost out of chalk, the stickman had grown faint. Still, he curled up against a little cloud in the corner of the notebook and fell asleep... Maybe someone will draw him back in someday.'
      },
      hint: { ja: '空ルートで、チョークが少ないまま自由帳へ', en: 'Reach the notebook by the Sky Route with little chalk left' }
    },
    3: {
      title: { ja: '地下からの自由帳', en: 'A Notebook from Underground' },
      text: {
        ja: 'チョーク置きの下をくぐりぬけて、棒人間は自由帳へ。朝、自由帳を開いた子は大よろこび！ ページには、棒人間と、地下で出会ったモグラやコウモリの友だちが描かれていた。',
        en: 'Slipping under the chalk tray, the stickman made it into the notebook. The kid who opened it in the morning was thrilled! The page showed the stickman with his underground friends, the moles and bats.'
      },
      hint: { ja: '地下ルートで、チョークをたくさん残して自由帳へ', en: 'Reach the notebook by the Underground Route with plenty of chalk left' }
    },
    4: {
      title: { ja: '土だらけの到着', en: 'Covered in Dirt' },
      text: {
        ja: 'チョークはあと少し。土だらけでヘトヘトの棒人間は、自由帳のすみっこで、小さく丸くなった。…でも、ちゃんとたどり着いた。',
        en: 'With just a little chalk left, the dirty, exhausted stickman curled up small in a corner of the notebook... but he made it all the same.'
      },
      hint: { ja: '地下ルートで、チョークが少ないまま自由帳へ', en: 'Reach the notebook by the Underground Route with little chalk left' }
    },
    5: {
      title: { ja: '黒板いっぱいの「{w}」', en: '"{w}" Across the Whole Board' },
      routeText: {
        sky: { ja: '空をこえてきた棒人間の、最後の言葉。', en: 'The last word of a stickman who crossed the sky. ' },
        under: { ja: '地下をぬけてきた棒人間の、最後の言葉。', en: 'The last word of a stickman who came up from underground. ' }
      },
      text: {
        ja: '最後に書いた「{w}」が、黒板いっぱいに広がった。朝、日直はその文字を見て、そこだけは消さずに残した。描いた子は、自由帳の中の棒人間を見つけて、にっこり笑った。',
        en: 'The "{w}" spread across the whole board. In the morning, the class monitor saw it and left that part unerased. The kid who drew him found the stickman in the notebook and smiled.'
      },
      hint: { ja: '最後の一言を「気持ち」のことばで。チョークはたくさん残して', en: 'Leave a word about feelings at the end, with plenty of chalk left' }
    },
    6: {
      title: { ja: 'かすれた「{w}」', en: 'A Faded "{w}"' },
      routeText: {
        sky: { ja: '空をこえてきた棒人間の、最後の言葉。', en: 'The last word of a stickman who crossed the sky. ' },
        under: { ja: '地下をぬけてきた棒人間の、最後の言葉。', en: 'The last word of a stickman who came up from underground. ' }
      },
      text: {
        ja: 'チョークが足りなくて、「{w}」はかすれてしまった。それでも、描いた子にはちゃんと読めた。自由帳のすみで、小さな棒人間が手をふっていた。',
        en: 'There wasn\'t enough chalk, and the "{w}" came out faint. But the kid who drew him could read it just fine. In a corner of the notebook, a tiny stickman was waving.'
      },
      hint: { ja: '最後の一言を「気持ち」のことばで。チョークが少ないまま', en: 'Leave a word about feelings at the end, with little chalk left' }
    },
    7: {
      title: { ja: '伝説の落書き', en: 'The Legendary Doodle' },
      text: {
        ja: 'ヘンなことばかり起きた冒険は、クラスじゅうのうわさになった。自由帳には、棒人間と、へんてこな仲間たちがぎっしり。みんなで自由帳をまわし読みして、教室は朝から大笑い！',
        en: 'An adventure full of weird happenings became the talk of the class. The notebook was packed with the stickman and his wacky friends. Everyone passed it around, and the classroom was laughing all morning!'
      },
      hint: { ja: '珍回答をたくさん出して、最後まで行く', en: 'Get lots of funny answers and make it to the end' }
    },
    8: {
      title: { ja: '黒板消しエンド', en: 'The Eraser' },
      text: {
        ja: 'チョークがなくなって、棒人間は黒板消しに消されてしまった…。',
        en: 'Out of chalk, the stickman was wiped away by the eraser...'
      },
      hint: { ja: 'チョークがなくなると…', en: 'If you run out of chalk...' }
    }
  };
})(window);
