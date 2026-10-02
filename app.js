(() => {
  'use strict';

  const rules = Array.isArray(window.RULES) ? window.RULES : [];
  const $ = id => document.getElementById(id);
  const toc = $('toc');
  const content = $('content');
  const search = $('search');
  const navSearch = $('navSearch');
  const resultInfo = $('resultInfo');
  const pageInfo = $('pageInfo');
  const prevBtn = $('prevBtn');
  const nextBtn = $('nextBtn');
  const crumbs = $('crumbs');
  const sidebar = $('sidebar');
  const BLOCK_SIZE = 25;

  const unique = values => [...new Set(values.filter(Boolean))];
  const byNumber = [...rules].sort((a, b) => Number(a.n) - Number(b.n));
  const books = unique(byNumber.map(r => r.book));
  const sourceSections = unique(byNumber.map(r => r.section));
  let filtered = byNumber.slice();
  let current = 0;
  let view = 'overview';
  let fontScale = 1;

  function getHashNumber() {
    const match = decodeURIComponent(location.hash).match(/§(\d+)/);
    return match ? Number(match[1]) : null;
  }

  const hashNumber = getHashNumber();
  if (hashNumber) {
    const index = byNumber.findIndex(r => Number(r.n) === hashNumber);
    if (index >= 0) current = index;
  }

  if ($('ruleCount')) $('ruleCount').textContent = rules.length;
  if ($('bookCount')) $('bookCount').textContent = books.length;
  if ($('sectionCount')) $('sectionCount').textContent = sourceSections.length;

  function esc(value = '') {
    return String(value).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function regexEsc(value = '') {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function mark(value, query) {
    const safe = esc(value);
    if (!query) return safe;
    return safe.replace(new RegExp(`(${regexEsc(query)})`, 'ig'), '<mark>$1</mark>');
  }

  function blockOf(n) {
    return Math.floor((Number(n) - 1) / BLOCK_SIZE) + 1;
  }

  function blockLabel(n) {
    const block = blockOf(n);
    const start = (block - 1) * BLOCK_SIZE + 1;
    const max = byNumber.length ? Math.max(...byNumber.map(r => Number(r.n))) : 0;
    const end = Math.min(block * BLOCK_SIZE, max);
    return `Reglas §${start}–§${end}`;
  }

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeMobileMenu() {
    document.body.classList.remove('sidebar-open');
  }

  function buildToc(filter = '') {
    if (!toc) return;
    toc.innerHTML = '';
    const q = filter.trim().toLowerCase();
    const blocks = [];
    for (let i = 0; i < byNumber.length; i += BLOCK_SIZE) {
      blocks.push(byNumber.slice(i, i + BLOCK_SIZE));
    }

    blocks.forEach((chunk, idx) => {
      const hay = chunk.map(r => `${r.n} ${r.section || ''} ${r.title || ''} ${r.text}`).join(' ').toLowerCase();
      if (q && !hay.includes(q)) return;

      const details = document.createElement('details');
      details.className = 'toc-block';
      if (!q && idx === blockOf((byNumber[current] || {}).n || 1) - 1) details.open = true;

      const summary = document.createElement('summary');
      summary.innerHTML = `<span class="toc-range">${esc(blockLabel(chunk[0].n))}</span><span class="toc-count">${chunk.length} reglas</span>`;
      details.appendChild(summary);

      const list = document.createElement('div');
      list.className = 'toc-rules';
      chunk.forEach(r => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'toc-rule';
        button.dataset.n = r.n;
        button.innerHTML = `<strong>§ ${esc(r.n)}</strong><span>${esc((r.title || r.section || '').replace(/^.*?—\s*/, ''))}</span>`;
        button.addEventListener('click', () => openRule(r.n));
        list.appendChild(button);
      });
      details.appendChild(list);
      toc.appendChild(details);
    });

    if (!toc.children.length) toc.innerHTML = '<div class="toc-empty">No hay coincidencias.</div>';
  }

  function renderOverview() {
    view = 'overview';
    document.body.classList.remove('reader-mode');
    const q = search ? search.value.trim().toLowerCase() : '';
    const source = q
      ? byNumber.filter(r => `${r.n} ${r.text} ${r.book} ${r.section} ${r.title}`.toLowerCase().includes(q))
      : byNumber;
    const groups = [];
    for (let i = 0; i < source.length; i += BLOCK_SIZE) groups.push(source.slice(i, i + BLOCK_SIZE));

    content.innerHTML = `
      <div class="overview-head">
        <div>
          <span class="eyebrow">ÍNDICE GENERAL</span>
          <h2>${q ? 'Resultados de búsqueda' : 'Todas las reglas'}</h2>
          <p>${q ? `${source.length} coincidencia(s) encontrada(s).` : 'Selecciona cualquier regla para abrirla en modo lectura.'}</p>
        </div>
        ${source.length ? '<button type="button" class="soft-btn" id="firstRuleBtn">Abrir § ' + esc(source[0].n) + ' →</button>' : ''}
      </div>` +
      (groups.length ? groups.map((group, gi) => `
        <section class="rule-group">
          <div class="group-head">
            <div><span>${esc(blockLabel(group[0].n))}</span><small>${group.length} reglas</small></div>
            <button type="button" class="link-btn" data-group="${gi}">Ver bloque</button>
          </div>
          <div class="rule-grid">
            ${group.map(r => `
              <button type="button" class="rule-tile" data-open="${esc(r.n)}">
                <span>§ ${esc(r.n)}</span>
                <strong>${esc(r.title || r.section || 'Regla')}</strong>
                <p>${mark(r.text.slice(0, 180), q)}${r.text.length > 180 ? '…' : ''}</p>
              </button>`).join('')}
          </div>
        </section>`).join('') : '<div class="empty">No se encontraron reglas.</div>');

    $('firstRuleBtn')?.addEventListener('click', () => source[0] && openRule(source[0].n));
    content.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => openRule(button.dataset.open)));
    content.querySelectorAll('.link-btn').forEach((button, index) => button.addEventListener('click', () => openRule(groups[index][0].n)));

    if (resultInfo) resultInfo.textContent = q ? `${source.length} resultado(s)` : `${rules.length} reglas disponibles`;
    if (pageInfo) pageInfo.textContent = 'Índice general';
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    if (crumbs) crumbs.textContent = 'Índice general';
  }

  function renderReader() {
    view = 'reader';
    document.body.classList.add('reader-mode');
    const r = filtered[current];
    if (!r) {
      content.innerHTML = '<div class="empty">No se encontraron reglas.</div>';
      return;
    }

    const q = search ? search.value.trim() : '';
    const pos = byNumber.findIndex(x => Number(x.n) === Number(r.n));
    const previous = byNumber[pos - 1];
    const next = byNumber[pos + 1];
    const related = byNumber.filter(x => x.section === r.section).slice(0, 6);

    content.innerHTML = `
      <div class="reading-head">
        <div class="reading-kicker">${esc(r.book || 'Documento')} · ${esc(blockLabel(r.n))}</div>
        <div class="reading-title-row">
          <div><h2>${esc(r.section || 'Reglas')}</h2><p>${esc(r.title || '')}</p></div>
          <div class="big-rule">§ ${esc(r.n)}</div>
        </div>
      </div>
      <article class="rule-page">
        <div class="page-top"><span>§ ${esc(r.n)}</span><span>${pos + 1} de ${byNumber.length}</span></div>
        <div class="rule-text">${mark(r.text, q)}</div>
      </article>
      <div class="below-reading">
        <section><div class="subhead">Reglas cercanas</div><div class="mini-list">
          ${related.map(x => `<button type="button" data-open="${esc(x.n)}" class="mini-rule ${Number(x.n) === Number(r.n) ? 'active' : ''}"><b>§ ${esc(x.n)}</b><span>${esc((x.title || x.section || '').replace(/^.*?—\s*/, ''))}</span></button>`).join('')}
        </div></section>
        <section class="jump-card"><div class="subhead">Ir directamente</div>
          <div class="jump-row"><input id="jumpInput" inputmode="numeric" pattern="[0-9]*" placeholder="Número de §" aria-label="Número de regla"><button type="button" id="jumpBtn" class="soft-btn">Abrir</button></div>
          <p>También puedes usar ← y → para recorrer las reglas.</p>
        </section>
      </div>`;

    content.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => openRule(button.dataset.open)));
    $('jumpBtn')?.addEventListener('click', jumpInput);
    $('jumpInput')?.addEventListener('keydown', event => { if (event.key === 'Enter') jumpInput(); });

    if (pageInfo) pageInfo.textContent = `§ ${r.n} · ${pos + 1}/${byNumber.length}`;
    if (resultInfo) resultInfo.textContent = q ? `${filtered.length} resultado(s) · § ${r.n}` : `Leyendo § ${r.n}`;
    if (prevBtn) {
      prevBtn.disabled = !previous;
      prevBtn.textContent = previous ? `← § ${previous.n}` : '← Anterior';
    }
    if (nextBtn) {
      nextBtn.disabled = !next;
      nextBtn.textContent = next ? `§ ${next.n} →` : 'Siguiente →';
    }
    if (crumbs) crumbs.textContent = `${r.book || ''} / ${r.section || ''} / § ${r.n}`.replace(/\/\s*\/\s*/g, ' / ');

    document.querySelectorAll('.toc-rule').forEach(button => button.classList.toggle('active', Number(button.dataset.n) === Number(r.n)));
    const activeBlock = document.querySelector(`.toc-rule[data-n="${CSS.escape(String(r.n))}"]`)?.closest('details');
    if (activeBlock) activeBlock.open = true;
  }

  function openRule(n) {
    const number = Number(n);
    if (!Number.isFinite(number)) return;
    let index = filtered.findIndex(r => Number(r.n) === number);
    if (index < 0) {
      if (search) search.value = '';
      filtered = byNumber.slice();
      buildToc('');
      index = filtered.findIndex(r => Number(r.n) === number);
    }
    if (index < 0) return;
    current = index;
    history.replaceState(null, '', `#§${filtered[current].n}`);
    renderReader();
    closeMobileMenu();
    scrollTop();
  }

  function jumpInput() {
    const value = Number($('jumpInput')?.value);
    if (value) openRule(value);
  }

  function doSearch() {
    const q = search ? search.value.trim().toLowerCase() : '';
    filtered = q
      ? byNumber.filter(r => `${r.n} ${r.text} ${r.book} ${r.section} ${r.title}`.toLowerCase().includes(q))
      : byNumber.slice();
    current = 0;
    buildToc(search?.value || '');
    renderOverview();
  }

  search?.addEventListener('input', doSearch);
  navSearch?.addEventListener('input', event => buildToc(event.target.value));

  prevBtn?.addEventListener('click', () => {
    if (current > 0) {
      current--;
      history.replaceState(null, '', `#§${filtered[current].n}`);
      renderReader();
      scrollTop();
    }
  });

  nextBtn?.addEventListener('click', () => {
    if (current < filtered.length - 1) {
      current++;
      history.replaceState(null, '', `#§${filtered[current].n}`);
      renderReader();
      scrollTop();
    }
  });

  $('fontBtn')?.addEventListener('click', () => {
    fontScale = fontScale === 1 ? 1.12 : fontScale === 1.12 ? 1.24 : 1;
    document.documentElement.style.setProperty('--reader-scale', fontScale);
    localStorage.setItem('readerScale', String(fontScale));
  });

  $('themeBtn')?.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
  });

  $('collapseBtn')?.addEventListener('click', () => document.body.classList.toggle('collapsed'));

  $('mobileMenu')?.addEventListener('click', () => document.body.classList.toggle('sidebar-open'));

  $('homeBtn')?.addEventListener('click', () => {
    if (search) search.value = '';
    filtered = byNumber.slice();
    buildToc('');
    renderOverview();
    history.replaceState(null, '', location.pathname + location.search);
    closeMobileMenu();
    scrollTop();
  });

  document.addEventListener('click', event => {
    if (!document.body.classList.contains('sidebar-open')) return;
    if (!sidebar?.contains(event.target) && !event.target.closest('#mobileMenu')) closeMobileMenu();
  });

  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      search?.focus();
    }
    if (event.key === 'Escape') {
      if (document.activeElement === search && search.value) {
        search.value = '';
        doSearch();
      } else {
        closeMobileMenu();
      }
    }
    if (view === 'reader' && !['INPUT', 'TEXTAREA', 'BUTTON'].includes(document.activeElement?.tagName)) {
      if (event.key === 'ArrowLeft' && prevBtn && !prevBtn.disabled) prevBtn.click();
      if (event.key === 'ArrowRight' && nextBtn && !nextBtn.disabled) nextBtn.click();
    }
  });

  window.addEventListener('hashchange', () => {
    const number = getHashNumber();
    if (number) openRule(number);
  });

  // Restore non-critical user preferences without ever preventing the page from loading.
  try {
    const savedScale = Number(localStorage.getItem('readerScale'));
    if ([1, 1.12, 1.24].includes(savedScale)) {
      fontScale = savedScale;
      document.documentElement.style.setProperty('--reader-scale', fontScale);
    }
    if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark');
  } catch (_) {}

  buildToc('');
  if (hashNumber && byNumber.some(r => Number(r.n) === hashNumber)) {
    filtered = byNumber.slice();
    current = byNumber.findIndex(r => Number(r.n) === hashNumber);
    renderReader();
  } else {
    renderOverview();
  }
})();
