# チョークマン／CHALK MAN（仮題）

放課後の黒板に描かれた棒人間が動き出し、黒板の端の「出口」を目指すブラウザゲーム。
プレイヤーが書いた単語は、絵にならずに**チョークの文字のまま「物」になる**（「オノ」と書けば「オノ」という文字が振られる）。
作者：Tanuki Box

いまは **WBS 2.（単語の判定）** まで。進み具合は `WBS.md`。

## 確認用の画面の見かた
- `index.html` をブラウザで開く（インターネットにつながっていると手書き風フォントになる）。
- 下（横画面は右）のタブで切り替える：
  - **棒人間**：11種類の動き。「全部を順番に再生」で順に流れる。
  - **文字**：単語を入れて「書く」。1文字ずつチョークで書かれて、ステージへ飛んでいく。タグのボタンで動き方が変わる。
  - **チョーク**：「失敗 −20」「章クリア +20」で体力（右下／左下のチョーク）が変わる。0 で黒板消しに消される。
  - **判定**：単語を書くと、辞書の結果（大分類・小分類・タグ）と判定の順番のどこで決まったかが出る。「例」のボタンで各段階を試せる。
- 右上：言語の切り替え（EN／日本語）と音のオン・オフ。

## ファイルの場所
| 場所 | 中身 |
| --- | --- |
| `WBS.md` | 作業の一覧と進み具合・決めたこと |
| `index.html` / `style.css` | ゲームの入れ物 |
| `js/common/` | Tanuki Box の共通土台（セーブ・日英切替・効果音とミュート）。DUST DASH と同じもの |
| `js/data/dictionary.js` | **単語の辞書**（1行に1単語。書き足し方はファイルの先頭） |
| `js/data/reactions.js` | 特別な単語（隠し反応）と、大分類ごとの共通反応 |
| `js/data/ngwords.js` | NGワード |
| `js/game/judge.js` | 単語の判定（表記ゆれ・判定の順番） |
| `js/game/config.js` | 調整用の数字（チョーク残量のルール、画面の割合、書く速さ）と色 |
| `js/game/lang.js` | 画面の文字（日本語・英語） |
| `js/game/chalk.js` | チョークの線・文字・かすれ、黒板の見た目 |
| `js/game/layout.js` | 画面の配置（スマホ縦／PC横／キーボードが開いたとき） |
| `js/game/stickman.js` | 棒人間の体と11種類の動き |
| `js/game/props.js` | はしご・水・穴・黒板消しなどの小道具 |
| `js/game/wordobj.js` | 文字オブジェクトと、1文字ずつ書く演出 |
| `js/game/tags.js` | 性質タグ15種類の動き方 |
| `js/game/gauge.js` | チョーク残量（体力） |
| `js/game/sfx.js` | 効果音（カツカツ・ドスン など。すべてその場で作る） |
| `js/game/fx.js` | 粉・音の文字・ハートなどの小さな演出、画面のゆれ |
| `js/game/lab.js` | 確認用の画面 |
| `js/game/main.js` | 起動・画面サイズ合わせ・毎フレームの描画 |
| `tools/check-dict.js` | 辞書を調べる（`node tools/check-dict.js`：語数・かぶり・タグの書き間違い） |
| `tools/test-judge.js` | 判定の自動テスト（`node tools/test-judge.js`） |
| `tools/build-single.js` | 全部を1つの HTML にまとめる道具（`node tools/build-single.js` → `dist/chalkman.html`） |

## 公開のしかた（GitHub Pages・無料）
DUST DASH と同じ手順です。
1. GitHub の TanukiBox/Chalkman → Settings → Pages → Build and deployment の Source を **Deploy from a branch**。
2. Branch を今のブランチ（`claude/game-development-hnf24z`）、フォルダを **/(root)** にして Save。
3. 1〜2分で https://tanukibox.github.io/Chalkman/ で開ける。以後、このブランチに push すると自動で更新される。
