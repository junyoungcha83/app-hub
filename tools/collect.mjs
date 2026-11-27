// 앱 목록 만들기: 각 앱의 실제 주소에서 manifest 를 읽어 이름·아이콘(지금 쓰는 그림)을 가져온다 → data/apps.json
//   node tools/collect.mjs
import fs from 'fs';
const G = 'https://junyoungcha83.github.io/';
// [id, 주소, 처음 분류]
const APPS = [
  ['household-account-book', G + 'household-account-book/', '생활·집안'], ['dinner', G + 'dinner/', '생활·집안'], ['diary-young', G + 'diary-young/', '생활·집안'],
  ['family-chart', G + 'family-chart/', '생활·집안'], ['family-schedule', G + 'family-schedule/', '생활·집안'], ['fuel-mate', G + 'fuel-mate/', '생활·집안'],
  ['book-collection', G + 'book-collection/', '생활·집안'], ['my-ai-secretary', 'https://my-ai-secretary.junyoung-cha83.workers.dev/', '생활·집안'],
  ['seungho-dict', G + 'seungho-dict/', '공부·아이'], ['hanja-study', G + 'hanja-study/', '공부·아이'], ['quiz-world', G + 'quiz-world/', '공부·아이'],
  ['school-timetable', G + 'school-timetable/', '공부·아이'], ['card-atlas', G + 'card-atlas/', '공부·아이'], ['origami', G + 'origami/', '공부·아이'], ['soccer-lineup', G + 'soccer-lineup/', '공부·아이'],
  ['game-world', G + 'game-world/', '게임·재미'], ['funfun', G + 'funfun/', '게임·재미'], ['fifa-guide', G + 'fifa-guide/', '게임·재미'], ['video-grid', G + 'video-grid/', '게임·재미'],
  ['article-search', G + 'article-search/', '일·돈'], ['blog-writer', G + 'blog-writer/', '일·돈'], ['briefing', G + 'briefing/', '일·돈'], ['corp-setup-guide', G + 'corp-setup-guide/', '일·돈'],
  ['stock-paper-dash', 'https://stock-paper-dash.pages.dev/', '일·돈'], ['realestate-auction', 'https://realestate-auction-myauction.junyoung-cha83.workers.dev/', '일·돈'], ['jido-finder', 'https://jido-finder.pages.dev/', '일·돈'],
  ['camping-finder', G + 'camping-finder/', '여행·바깥'], ['flight-deals', G + 'flight-deals/', '여행·바깥'], ['fukuoka-beppu-trip', G + 'fukuoka-beppu-trip/', '여행·바깥'],
];
const BRAVE = new Set(['origami']); // 안드로이드에서 Brave 로 열 앱(기본값, 설정에서 앱마다 바꿀 수 있음)
const NAMES = { 'realestate-auction': '경매 사건 목록', 'stock-paper-dash': '페이퍼 트레이딩', 'my-ai-secretary': 'AI 비서' };
// 아이콘이 없는(또는 로그인 때문에 못 가져오는) 앱은 여기 그린 그림을 씀(assets/icons/)
const ICONS = { 'stock-paper-dash': 'assets/icons/paper-trading.svg', 'realestate-auction': 'assets/icons/realestate-auction.svg' };
const abs = (u, base) => new URL(u, base).href;
async function get(u) { const r = await fetch(u, { redirect: 'follow' }); if (!r.ok) throw new Error(r.status); return r; }
function pickIcon(icons) {
  const png = icons.filter((i) => /png/.test(i.type || i.src) && !/maskable/.test(i.purpose || ''));
  const size = (i) => Math.max(...String(i.sizes || '0').split(' ').map((s) => +s.split('x')[0] || 0));
  png.sort((a, b) => Math.abs(size(a) - 192) - Math.abs(size(b) - 192));
  return png[0] || icons.find((i) => /svg/.test(i.type || i.src)) || icons.find((i) => !/maskable/.test(i.purpose || '')) || icons[0];
}
const out = [];
for (const [id, url, cat] of APPS) {
  const a = { id, name: NAMES[id] || id, url, icon: '', cat, ...(BRAVE.has(id) ? { brave: true } : {}) };
  if (url) {
    try {
      const res = await get(url);
      if (new URL(res.url).host !== new URL(url).host) throw new Error('로그인 화면으로 넘어감(' + new URL(res.url).host + ') — 이름·아이콘은 못 가져옴');
      const html = await res.text();
      const t = html.match(/<title>([^<]*)<\/title>/i); if (t && !NAMES[id]) a.name = t[1].trim();
      const ml = html.match(/<link[^>]+rel=["']manifest["'][^>]*>/i)?.[0]?.match(/href=["']([^"']+)/)?.[1];
      if (ml) {
        const murl = abs(ml, url), m = await (await get(murl)).json();
        if (!NAMES[id]) a.name = m.short_name && m.name && m.name.length > 10 ? m.short_name : m.name || a.name;
        if (m.icons?.length) a.icon = abs(pickIcon(m.icons).src, murl);
      }
      if (!a.icon) { const li = html.match(/<link[^>]+rel=["'](?:apple-touch-icon|icon)["'][^>]*>/i)?.[0]?.match(/href=["']([^"']+)/)?.[1]; if (li) a.icon = abs(li, url); }
      if (a.icon) await get(a.icon); // 그림이 실제로 열리는지
    } catch (e) { a.err = String(e.message || e); }
  }
  if (ICONS[id]) a.icon = ICONS[id];
  out.push(a);
  console.log(`${a.err ? '⚠️' : '✓'} ${a.cat} | ${a.name} | ${a.icon || '(아이콘 없음)'}${a.err ? ' | ' + a.err : ''}`);
}
fs.writeFileSync(new URL('../data/apps.json', import.meta.url), JSON.stringify(out.map(({ err, ...x }) => x), null, 1));
