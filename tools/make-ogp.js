#!/usr/bin/env node
/*
 * リンクの見た目（OGP）の画像を作る：assets/ogp.png（1200×630）
 *   ゲームと同じ黒板・チョークの描き方で、題名と「はしご」を持ち上げる棒人間を描く
 *   使うもの：Playwright（ブラウザを自動で動かす道具）
 *   node tools/make-ogp.js
 */
const { chromium } = (function () { try { return require('playwright'); } catch (e) { return require('/opt/node22/lib/node_modules/playwright'); } })();
const fs = require('fs');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'ja-JP' });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERR', e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'index.html'), { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  console.log('font ok:', await page.evaluate(() => document.fonts.check('40px "Yomogi"')));
  const url = await page.evaluate(() => {
    const COL = CM.COL, W = 1200, H = 630, s = 3.0;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const layer = document.createElement('canvas'); layer.width = W; layer.height = H;
    const lc = layer.getContext('2d');
    ctx.fillStyle = COL.wood; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = COL.woodDark; ctx.fillRect(0, H - 36, W, 36);
    const g = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 700);
    g.addColorStop(0, COL.boardLight); g.addColorStop(1, COL.board);
    ctx.fillStyle = g; ctx.fillRect(28, 28, W - 56, H - 84);
    // うすい消し残りの落書き
    [['じゃんけん', 180, 470, -0.1], ['2+3=5', 640, 70, 0.05]].forEach(d => CM.chalk.text(lc, d[0], d[1], d[2], { size: 34, alpha: 0.12, rot: d[3] }));
    CM.chalk.text(lc, 'チョークマン', 350, 150, { size: 92, color: COL.chalk });
    CM.chalk.text(lc, 'CHALK MAN', 350, 245, { size: 48, color: COL.yellow });
    CM.chalk.text(lc, '書いたことばが、', 350, 350, { size: 44, color: COL.chalk });
    CM.chalk.text(lc, 'そのまま「物」になる。', 350, 412, { size: 44, color: COL.chalk });
    CM.chalk.text(lc, 'Write a word. It becomes real.', 350, 490, { size: 28, color: COL.pink, alpha: 0.85 });
    // 棒人間が、書いた「はしご」をのぼる
    CM.chalk.line(lc, [700, 520, 1140, 520], { w: 5, seed: 3 });
    // 書いたことば「はしご」が、そのまま物になって、棒人間が持ち上げている
    const A = CM.MAN_ANIMS.cheer;
    const env = { stage: { x: 700, y: 0, w: 460, h: H }, groundY: 520, cx: 930, s: s, fixedX: 930, f: -1 };
    const fr = A.frame(0, env, {}, 0);
    const j = CM.drawMan(lc, fr.pose, s, 0, {});
    const hand = j.handF;
    CM.chalk.text(lc, 'はしご', hand[0] - 10, hand[1] - 48, { size: 88, color: COL.yellow, rot: -0.1 });
    for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.42, cx = hand[0] - 10, cy = hand[1] - 48; CM.chalk.line(lc, [cx + Math.cos(a) * 165, cy + Math.sin(a) * 85, cx + Math.cos(a) * 195, cy + Math.sin(a) * 105], { w: 5, color: COL.yellow, seed: 40 + i }); }
    CM.chalk.applyGrain(lc, 0.8);
    ctx.drawImage(layer, 0, 0);
    ctx.fillStyle = '#f4e3c8'; ctx.font = '24px ' + CM.FONT; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText('Tanuki Box', W - 40, H - 18);
    return c.toDataURL('image/png');
  });
  fs.writeFileSync(path.join(__dirname, '..', 'assets', 'ogp.png'), Buffer.from(url.split(',')[1], 'base64'));
  await browser.close();
})();
