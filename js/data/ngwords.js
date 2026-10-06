/*
 * CHALK MAN NGワード（書いてほしくない言葉）
 * 性的な言葉・差別語・暴言。書くと黒板消しがサッと消して「書き直してね」と表示する（チョークは減らない）。
 * シェアの文章にも入らない。ゲームの画面にこの一覧が出ることはない。
 *
 * ■ 書き方
 *   ひらがな・小文字で書く（カタカナ・大文字・全角・スペースは自動でそろえてから調べる）。
 *   exact    ：入力がこの言葉「そのもの」のときだけ NG（「ばか」は NG、「ばかり」は OK）
 *   contains ：入力の「どこかに」入っていたら NG（長くて、ほかの言葉にまぎれにくいものだけ）
 *   英語の複数形（-s）も自動で調べる。
 */
(function (global) {
  'use strict';
  var CM = global.CM = global.CM || {};

  CM.NG_WORDS = {
    exact: [
      // ---- 暴言 ----
      'しね', 'ころす', 'きえろ', 'うざい', 'うざ', 'きもい', 'きしょい', 'くず', 'かす', 'ごみくず',
      'ばか', '馬鹿', 'あほ', '阿呆', 'ぶす', 'でぶ', 'はげ', 'ぶさいく', 'のろま', 'まぬけ', 'くそ', '糞',
      'くそやろう', 'ばかやろう', 'ぼけ', 'かすやろう', 'ちね',
      'idiot', 'stupid', 'moron', 'dumb', 'dumbass', 'loser', 'kys', 'diedie', 'godie', 'shutup',
      'fuckoff', 'damn', 'crap', 'shit', 'ass', 'jerk', 'twat', 'wanker', 'prick',
      // ---- 性的な言葉 ----
      'えろ', 'えっち', 'せっくす', 'おっぱい', 'ちんこ', 'ちんちん', 'ちんぽ', 'まんこ', 'ぱんてぃ',
      'おなにー', 'ふぇら', 'れいぷ', 'ぬーど', 'はだか', '裸', 'あだると',
      'sex', 'sexy', 'porn', 'porno', 'nude', 'naked', 'penis', 'vagina', 'boob', 'boobs', 'tits', 'titty',
      'dick', 'cock', 'pussy', 'cum', 'rape', 'rapist', 'horny', 'hentai', 'nsfw', 'milf', 'anal', 'orgasm',
      'whore', 'slut', 'hooker', 'erotic',
      // ---- 差別語 ----
      'きちがい', '気違い', 'がいじ', 'めくら', 'つんぼ', 'かたわ', 'びっこ', 'ちょん', 'ちょんこ', 'しな', 'しなじん',
      'えた', 'ひにん', 'くろんぼ', 'ほも', 'おかま', 'れず', 'じゃっぷ', 'ちゃんころ', 'けとう',
      'retard', 'retarded', 'spaz', 'cripple', 'jap', 'chink', 'gook', 'spic', 'wetback', 'kike', 'nigger', 'nigga',
      'negro', 'coon', 'faggot', 'fag', 'dyke', 'tranny', 'shemale', 'gypsy', 'paki', 'raghead', 'towelhead'
    ],
    contains: [
      // ---- 暴言 ----
      '死ね', '殺す', 'ころしてやる', '殺してやる', '消えろ', 'しんでしまえ', '死んでしまえ', 'くたばれ',
      'killyourself', 'fuck', 'motherf', 'bullshit', 'asshole', 'bitch', 'bastard', 'dickhead', 'shithead',
      // ---- 性的な言葉 ----
      'せっくす', 'おっぱい', 'まんこ', 'ちんぽ', '強姦', '射精', '勃起', '性交', '自慰', 'えろほん', 'えろどうが',
      'pornhub', 'blowjob', 'handjob', 'masturbat', 'erection', 'intercourse', 'porn', 'xxx',
      // ---- 差別語 ----
      'きちがい', '気違い', '支那', 'めくら', 'nigger', 'nigga', 'faggot', 'retard'
    ]
  };
})(window);
