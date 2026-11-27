'use strict';
/* 차준영(앱 모음) — 내가 만든 앱을 한 화면에서.
 *  앱 목록(이름·주소·지금 쓰는 아이콘)은 data/apps.json (tools/collect.mjs 가 각 앱의 manifest 에서 가져옴).
 *  분류·순서·설명·색깔·주소 고침은 이 기기 localStorage 에만 저장(기기마다 따로). 백업은 설정 > 내보내기.
 *  색깔: 앱에 따로 정한 색 > 그 앱 분류의 색 > 없음.
 */
const DEFAULT_CATS = ['생활·집안', '공부·아이', '게임·재미', '일·돈', '여행·바깥'];
const COLORS = ['#e74c3c', '#e67e22', '#f1c40f', '#27ae60', '#16a085', '#2980b9', '#4255d4', '#8e44ad', '#e84393', '#7f8c8d'];
const $ = (id) => document.getElementById(id);
const BAND_DEFAULT = '#5b6378'; // 색을 안 정한 분류의 띠 색
// 배경이 밝으면 검은 글자, 어두우면 흰 글자(노란 띠에 흰 글자가 안 보이지 않게)
function inkOn(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return 'light';
  const n = parseInt(m[1], 16), [r, g, b] = [n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? 'dark' : 'light';
}
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let BASE = [];   // data/apps.json
let ST = load(); // { cats:[], order:{cat:[id]}, meta:{id:{desc,cat,color,url}}, catColors:{cat:color} }
function load() {
  try { const v = JSON.parse(localStorage.getItem('app-hub') || '{}'); return { cats: v.cats || [...DEFAULT_CATS], order: v.order || {}, meta: v.meta || {}, catColors: v.catColors || {} }; }
  catch { return { cats: [...DEFAULT_CATS], order: {}, meta: {}, catColors: {} }; }
}
const save = () => { try { localStorage.setItem('app-hub', JSON.stringify(ST)); } catch {} };

// 기본 목록 + 이 기기에서 바꾼 것
function apps() {
  return BASE.map((a) => {
    const m = ST.meta[a.id] || {};
    const cat = m.cat && ST.cats.includes(m.cat) ? m.cat : ST.cats.includes(a.cat) ? a.cat : (ST.cats[0] || '미분류');
    return { ...a, url: m.url ?? a.url, brave: m.brave ?? !!a.brave, desc: m.desc || '', ownColor: m.color || '', color: m.color || ST.catColors[cat] || '', cat };
  });
}
function byCat() {
  const list = apps(), out = [];
  for (const c of ST.cats) {
    const items = list.filter((a) => a.cat === c);
    const ord = ST.order[c] || [];
    const pos = (x) => { const i = ord.indexOf(x.id); return i < 0 ? 1e4 + BASE.findIndex((y) => y.id === x.id) : i; }; // 옮긴 순서 먼저, 나머지는 기본 순서
    items.sort((a, b) => pos(a) - pos(b));
    out.push([c, items]);
  }
  return out;
}
// Brave 로 열기: 안드로이드 Chrome·삼성 인터넷은 intent 링크로 특정 앱(com.brave.browser)을 지정해 열 수 있다.
// Brave 가 없으면 S.browser_fallback_url 로 원래 주소. PC·아이폰에서는 그냥 원래 주소(브라우저를 고를 방법이 없음).
const IS_ANDROID = /Android/i.test(navigator.userAgent);
function openHref(a) {
  if (!a.brave || !IS_ANDROID || !/^https:\/\//.test(a.url)) return { href: a.url, target: '_blank' };
  const u = new URL(a.url);
  return { href: `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.brave.browser;S.browser_fallback_url=${encodeURIComponent(a.url)};end`, target: '' };
}
const iconHTML = (a, cls = '') => a.icon
  ? `<img src="${esc(a.icon)}" alt="" loading="lazy" draggable="false" class="${cls}" onerror="this.outerHTML='<span class=&quot;letter ${cls}&quot;>${esc(a.name.slice(0, 1))}</span>'">`
  : `<span class="letter ${cls}" style="${a.color ? `--c:${a.color}` : ''}">${esc(a.name.slice(0, 1))}</span>`;
let toastT;
function toast(m) { const t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2000); }
async function copy(text) {
  try { await navigator.clipboard.writeText(text); }
  catch { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch {} t.remove(); }
  toast('주소를 복사했어요');
}

/* ───────────── 탭 ───────────── */
// 디자인: 기본은 시안 A(밤하늘 글래스, 2026-11-28 선택). ?theme=b 크림 · ?theme=classic 예전 밝은 모습 미리보기.
const THEME = (new URLSearchParams(location.search).get('theme') || 'a').toLowerCase();
if (['a', 'b'].includes(THEME)) document.body.dataset.theme = THEME;
// 분류 색 세기: 기본은 2(은은한 유리 띠, 2026-11-28 선택). ?band=1 파스텔 띠 · ?band=0 예전 진한 색 미리보기
const BAND = new URLSearchParams(location.search).get('band') ?? '2';
if (['1', '2'].includes(BAND)) document.body.dataset.band = BAND;
let tab = 'view';
document.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => { tab = b.dataset.tab; render(); }; });
function render() {
  document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  $('title').textContent = tab === 'view' ? '차준영' : '설정';
  $('hint').textContent = tab === 'view' ? '길게 눌러 끌면 같은 분류 안에서 순서 바꾸기' : '';
  tab === 'view' ? viewTab() : settingsTab();
}

/* ───────────── 보기 ───────────── */
function heroHTML() {
  if (!document.body.dataset.theme) return '';
  const d = new Date(), wd = '일월화수목금토'[d.getDay()];
  return `<div class="hero"><div class="hero-name">차준영</div><div class="hero-sub">${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${wd}요일 · 앱 ${BASE.length}개</div></div>`;
}
function viewTab() {
  const groups = byCat().filter(([, items]) => items.length);
  $('view').innerHTML = heroHTML() + (groups.length ? groups.map(([c, items]) => `
    <div class="band${inkOn(ST.catColors[c] || BAND_DEFAULT) === 'dark' ? ' dark' : ''}" style="--b:${ST.catColors[c] || BAND_DEFAULT}"><span>${esc(c)}</span><span class="n">${items.length}</span></div>
    <div class="grid" data-cat="${esc(c)}"${ST.catColors[c] ? ` data-color="${ST.catColors[c]}"` : ''}>${items.map((a) => `
      <div class="app${a.color ? ' tint' : ''}" data-id="${a.id}" style="${a.color ? `--c:${a.color}` : ''}">
        ${a.url ? ((o) => `<a href="${esc(o.href)}"${o.target ? ` target="${o.target}"` : ''} rel="noopener" draggable="false">`)(openHref(a)) : `<a href="#" data-need="${a.id}" draggable="false">`}
          ${iconHTML(a)}<span class="name">${esc(a.name)}</span>${a.desc ? `<span class="desc">${esc(a.desc)}</span>` : ''}${a.url ? '' : '<span class="need">주소 필요</span>'}${a.brave ? '<span class="brave" title="안드로이드에서 Brave 로 열려요">🦁 Brave</span>' : ''}
        </a>
        ${a.url ? `<button class="copy" data-copy="${esc(a.url)}" aria-label="주소 복사">📋</button>` : ''}
      </div>`).join('')}</div>`).join('') : '<p class="empty">보여 줄 앱이 없어요.</p>');
  document.querySelectorAll('[data-copy]').forEach((b) => { b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); copy(b.dataset.copy); }; });
  document.querySelectorAll('[data-need]').forEach((a) => { a.onclick = (e) => { e.preventDefault(); toast('설정에서 주소를 넣어 주세요'); editApp(a.dataset.need); }; });
  document.querySelectorAll('.app').forEach(dragable);
  fillSlots();
}
// 분류 마지막 줄의 빈칸을 같은 모양의 빈 틀로 채운다(열 수가 화면 폭 따라 바뀌므로 그때그때 계산)
function fillSlots() {
  document.querySelectorAll('.grid').forEach((g) => {
    g.querySelectorAll('.slot').forEach((x) => x.remove());
    const cols = getComputedStyle(g).gridTemplateColumns.split(' ').filter(Boolean).length || 1;
    const n = g.querySelectorAll('.app').length, k = (cols - (n % cols)) % cols;
    const c = g.dataset.color;
    for (let i = 0; i < k; i++) {
      const d = document.createElement('div');
      d.className = 'slot' + (c ? ' tint' : ''); if (c) d.style.setProperty('--c', c);
      d.setAttribute('aria-hidden', 'true');
      g.appendChild(d);
    }
  });
}
let resizeT;
addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (tab === 'view') fillSlots(); }, 120); });

// 길게 눌러(0.35초) 끌기 — 같은 분류(grid) 안에서만. 짧게 누르면 앱 열기, 누른 채 움직이면 화면 스크롤.
let justDragged = false;
document.addEventListener('click', (e) => { if (justDragged && e.target.closest('.app')) { e.preventDefault(); e.stopPropagation(); } }, true);
document.addEventListener('contextmenu', (e) => { if (e.target.closest('.app')) e.preventDefault(); });
function dragable(el) {
  let timer = null, start = null, drag = null;
  const grid = el.parentElement;
  el.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.copy') || e.button > 0) return;
    start = { x: e.clientX, y: e.clientY, id: e.pointerId };
    timer = setTimeout(() => begin(e), 350);
  });
  el.addEventListener('pointermove', (e) => {
    if (!drag) { if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) { clearTimeout(timer); start = null; } return; }
    e.preventDefault();
    move(e.clientX, e.clientY);
  });
  const end = () => {
    clearTimeout(timer); start = null;
    if (!drag) return;
    const { ghost } = drag;
    el.classList.remove('dragging'); el.style.cssText = drag.style;
    ghost.replaceWith(el);
    drag = null;
    const cat = grid.dataset.cat;
    ST.order[cat] = [...grid.querySelectorAll('.app')].map((x) => x.dataset.id); save();
    justDragged = true; setTimeout(() => { justDragged = false; }, 300);
    toast('순서를 바꿨어요');
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  function begin(e) {
    const r = el.getBoundingClientRect();
    const ghost = el.cloneNode(true); ghost.classList.add('ghost'); ghost.querySelector('.copy')?.remove();
    drag = { ghost, dx: e.clientX - r.left, dy: e.clientY - r.top, w: r.width, style: el.style.cssText };
    el.before(ghost);
    el.style.width = r.width + 'px'; el.style.left = r.left + 'px'; el.style.top = r.top + 'px';
    el.classList.add('dragging');
    try { el.setPointerCapture(e.pointerId); } catch {}
    navigator.vibrate?.(15);
  }
  function move(x, y) {
    el.style.left = x - drag.dx + 'px'; el.style.top = y - drag.dy + 'px';
    const over = document.elementFromPoint(x, y)?.closest('.app');
    if (!over || over === drag.ghost || over.parentElement !== grid) return; // 다른 분류로는 안 옮김
    const rr = over.getBoundingClientRect();
    const after = x > rr.left + rr.width / 2 || (y > rr.bottom - rr.height / 4);
    after ? over.after(drag.ghost) : over.before(drag.ghost);
  }
}

/* ───────────── 설정 ───────────── */
function settingsTab() {
  const groups = byCat();
  $('view').innerHTML = `
    <div class="card"><h3>🗂️ 분류</h3>
      ${ST.cats.map((c, i) => `<div class="row"><span class="dot" style="background:${ST.catColors[c] || '#fff'}"></span><span class="grow"><b>${esc(c)}</b><small>${groups.find(([x]) => x === c)?.[1].length || 0}개</small></span>
        <button class="btn small" data-ccol="${i}">🎨 색깔</button>
        <button class="btn small" data-up="${i}" ${i ? '' : 'disabled'}>▲</button><button class="btn small" data-down="${i}" ${i < ST.cats.length - 1 ? '' : 'disabled'}>▼</button>
        <button class="btn small" data-rn="${i}">이름</button><button class="btn small danger" data-del="${i}">지우기</button></div>`).join('')}
      <div class="acts"><button class="btn" id="addCat">＋ 분류 추가</button></div>
      <p class="note">분류를 지우면 그 안의 앱은 첫 번째 분류로 옮겨져요. 분류 순서가 보기 화면 순서예요.<br>🎨 분류 색깔은 그 분류의 모든 앱 카드에 칠해져요(앱에 따로 정한 색이 있으면 그 색이 먼저).</p></div>
    <div class="card"><h3>📱 앱 (눌러서 설명·분류·색깔 바꾸기)</h3>
      ${groups.map(([c, items]) => items.length ? `<div class="cat-h">${esc(c)}</div>` + items.map((a) => `<div class="row" data-edit="${a.id}" style="${a.color ? `--c:${a.color}` : ''}">
        ${iconHTML(a)}<span class="grow"><b>${esc(a.name)}${a.brave ? ' 🦁' : ''}</b><small>${esc(a.desc || (a.url ? '설명 없음' : '⚠️ 주소 필요'))}</small></span>
        <span class="dot" style="background:${a.color || '#fff'}"></span><button class="btn small">수정</button></div>`).join('') : '').join('')}</div>
    <div class="card"><h3>💾 설정 옮기기·되돌리기</h3>
      <p class="note">설정은 이 기기에만 저장돼요. 다른 폰·PC에서도 같게 쓰려면 ‘내보내기’로 복사해 그 기기의 ‘가져오기’에 붙여 넣으세요.</p>
      <div class="acts"><button class="btn" id="exp">내보내기(복사)</button><button class="btn" id="imp">가져오기</button><button class="btn danger" id="reset">처음 상태로</button></div></div>
    <div class="card"><h3>ℹ️ 정보</h3><p class="note">앱 ${BASE.length}개 · 아이콘은 각 앱이 지금 쓰는 그림을 그 앱 주소에서 바로 불러와요(앱 아이콘을 바꾸면 여기도 바뀜).</p></div>`;
  const mv = (i, d) => { const c = ST.cats; [c[i], c[i + d]] = [c[i + d], c[i]]; save(); render(); };
  document.querySelectorAll('[data-up]').forEach((b) => { b.onclick = () => mv(+b.dataset.up, -1); });
  document.querySelectorAll('[data-down]').forEach((b) => { b.onclick = () => mv(+b.dataset.down, 1); });
  document.querySelectorAll('[data-rn]').forEach((b) => { b.onclick = () => catName(+b.dataset.rn); });
  document.querySelectorAll('[data-ccol]').forEach((b) => { b.onclick = () => catColor(+b.dataset.ccol); });
  document.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => delCat(+b.dataset.del); });
  $('addCat').onclick = () => catName(-1);
  document.querySelectorAll('[data-edit]').forEach((r) => { r.onclick = () => editApp(r.dataset.edit); });
  $('exp').onclick = () => { copy(JSON.stringify(ST)); toast('설정을 복사했어요 — 다른 기기의 가져오기에 붙여 넣으세요'); };
  $('imp').onclick = () => openSheet('설정 가져오기', `<p class="note">다른 기기에서 ‘내보내기’로 복사한 글을 붙여 넣으세요.</p><textarea class="json" id="impT"></textarea><div class="acts"><button class="btn pri" id="impGo">가져오기</button></div>`, () => {
    $('impGo').onclick = () => {
      try { const v = JSON.parse($('impT').value); if (!Array.isArray(v.cats) || typeof v.meta !== 'object') throw 0; ST = { cats: v.cats, order: v.order || {}, meta: v.meta, catColors: v.catColors || {} }; save(); closeSheet(); render(); toast('가져왔어요'); }
      catch { toast('형식이 맞지 않아요'); }
    };
  });
  let armed = false;
  $('reset').onclick = () => { if (!armed) { armed = true; $('reset').textContent = '한 번 더 누르면 초기화'; setTimeout(() => { armed = false; $('reset') && ($('reset').textContent = '처음 상태로'); }, 3000); return; } localStorage.removeItem('app-hub'); ST = load(); render(); toast('처음 상태로 되돌렸어요'); };
}
function catName(i) {
  const cur = i >= 0 ? ST.cats[i] : '';
  openSheet(i >= 0 ? '분류 이름 바꾸기' : '분류 추가', `<label class="f"><span>분류 이름</span><input type="text" id="cn" maxlength="20" value="${esc(cur)}"></label><div class="acts"><button class="btn pri" id="cnGo">저장</button></div>`, () => {
    $('cn').focus();
    $('cnGo').onclick = () => {
      const v = $('cn').value.trim();
      if (!v) return toast('이름을 넣어 주세요');
      if (v !== cur && ST.cats.includes(v)) return toast('같은 이름이 있어요');
      if (i < 0) ST.cats.push(v);
      else {
        ST.cats[i] = v;
        for (const m of Object.values(ST.meta)) if (m.cat === cur) m.cat = v;
        for (const a of BASE) if (a.cat === cur && !ST.meta[a.id]?.cat) (ST.meta[a.id] ||= {}).cat = v; // 기본 분류였던 앱도 따라감
        if (ST.order[cur]) { ST.order[v] = ST.order[cur]; delete ST.order[cur]; }
        if (ST.catColors[cur]) { ST.catColors[v] = ST.catColors[cur]; delete ST.catColors[cur]; }
      }
      save(); closeSheet(); render();
    };
  });
}
function catColor(i) {
  const c = ST.cats[i];
  let color = ST.catColors[c] || '';
  openSheet(`‘${c}’ 분류 색깔`, `<p class="note">이 분류의 모든 앱 카드에 칠해져요. 앱에 따로 정한 색이 있으면 그 색이 먼저예요.</p>
    <div class="swatches" id="cCol"><button class="sw none${color ? '' : ' on'}" data-c="" aria-label="색 없음"></button>
      ${COLORS.map((x) => `<button class="sw${color === x ? ' on' : ''}" data-c="${x}" style="background:${x}"></button>`).join('')}
      <input type="color" id="cCustom" value="${color || '#4255d4'}" title="다른 색"></div>
    <div class="acts"><button class="btn pri" id="cSave">저장</button></div>`, () => {
    const pick = (x) => { color = x; document.querySelectorAll('#cCol .sw').forEach((b) => b.classList.toggle('on', b.dataset.c === x)); };
    document.querySelectorAll('#cCol .sw').forEach((b) => { b.onclick = () => pick(b.dataset.c); });
    $('cCustom').oninput = (e) => pick(e.target.value);
    $('cSave').onclick = () => { if (color) ST.catColors[c] = color; else delete ST.catColors[c]; save(); closeSheet(); render(); toast(color ? '분류 색깔을 정했어요' : '분류 색깔을 지웠어요'); };
  });
}
function delCat(i) {
  if (ST.cats.length <= 1) return toast('분류는 하나 이상 있어야 해요');
  const c = ST.cats[i];
  ST.cats.splice(i, 1);
  for (const a of apps()) if (a.cat === c || (ST.meta[a.id]?.cat === c)) (ST.meta[a.id] ||= {}).cat = ST.cats[0];
  delete ST.order[c]; delete ST.catColors[c]; save(); render(); toast(`‘${c}’ 분류를 지웠어요`);
}
function editApp(id) {
  const a = apps().find((x) => x.id === id);
  let color = a.ownColor;
  openSheet(a.name, `
    <label class="f"><span>아이콘 아래 설명</span><input type="text" id="eDesc" maxlength="40" value="${esc(a.desc)}" placeholder="예: 우리 집 가계부"></label>
    <label class="f"><span>분류</span><select id="eCat">${ST.cats.map((c) => `<option ${c === a.cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
    <div class="f"><span>색깔 (빗금 = 분류 색 따르기${ST.catColors[a.cat] ? '' : ', 지금 분류엔 색 없음'})</span><div class="swatches" id="eCol"><button class="sw none${color ? '' : ' on'}" data-c="" aria-label="분류 색 따르기"></button>
      ${COLORS.map((c) => `<button class="sw${color === c ? ' on' : ''}" data-c="${c}" style="background:${c}"></button>`).join('')}
      <input type="color" id="eCustom" value="${color || '#4255d4'}" title="다른 색"></div></div>
    <label class="f"><span>주소</span><input type="url" id="eUrl" value="${esc(a.url)}" placeholder="https://..."></label>
    <label class="f chkrow"><input type="checkbox" id="eBrave" ${a.brave ? 'checked' : ''}> <span>🦁 Brave로 열기 <small>(안드로이드 폰에서만 · Brave 가 없으면 원래대로 열림)</small></span></label>
    <div class="acts"><button class="btn" id="eCopy" ${a.url ? '' : 'disabled'}>📋 주소 복사</button><button class="btn pri" id="eSave">저장</button></div>`, () => {
    const pick = (c) => { color = c; document.querySelectorAll('#eCol .sw').forEach((b) => b.classList.toggle('on', b.dataset.c === c)); };
    document.querySelectorAll('#eCol .sw').forEach((b) => { b.onclick = () => pick(b.dataset.c); });
    $('eCustom').oninput = (e) => pick(e.target.value);
    $('eCopy').onclick = () => copy(a.url);
    $('eSave').onclick = () => {
      const url = $('eUrl').value.trim();
      if (url && !/^https?:\/\//.test(url)) return toast('주소는 https:// 로 시작해야 해요');
      const m = (ST.meta[id] ||= {});
      m.desc = $('eDesc').value.trim(); m.color = color; m.cat = $('eCat').value;
      const bd = !!BASE.find((x) => x.id === id).brave, bv = $('eBrave').checked;
      if (bv !== bd) m.brave = bv; else delete m.brave;
      const base = BASE.find((x) => x.id === id).url;
      if (url !== base) m.url = url; else delete m.url;
      save(); closeSheet(); render(); toast('저장했어요');
    };
  });
}
let sheetOpen = false;
function openSheet(title, html, wire) {
  $('sheetTitle').textContent = title; $('sheetBody').innerHTML = html; $('sheet').hidden = false;
  if (!sheetOpen) { history.pushState({ sheet: 1 }, ''); sheetOpen = true; }
  wire?.();
}
function closeSheet(fromPop) { if (!sheetOpen) return; sheetOpen = false; $('sheet').hidden = true; if (!fromPop && history.state?.sheet) history.back(); }
addEventListener('popstate', () => closeSheet(true));
$('sheetClose').onclick = () => closeSheet();
document.querySelector('.sheet-bg').onclick = () => closeSheet();

(async function start() {
  try { BASE = await (await fetch('data/apps.json')).json(); } catch { $('view').innerHTML = '<p class="empty">목록을 불러오지 못했어요.</p>'; return; }
  for (const a of BASE) if (!ST.cats.includes(a.cat) && !ST.meta[a.id]?.cat && !DEFAULT_CATS.includes(a.cat)) ST.cats.push(a.cat);
  render();
})();
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
