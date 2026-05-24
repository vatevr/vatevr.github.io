(() => {
  'use strict';

  const IMAGE_W = 5649;
  const IMAGE_H = 4000;

  // How much context around the proverb rect we show in focus mode.
  const FOCUS_PAD = 0.7;

  const $ = (id) => document.getElementById(id);
  const els = {
    body: document.body,
    canvas: $('canvas'),
    reticle: $('reticle'),
    hoverRing: $('hoverRing'),
    tooltip: $('tooltip'),
    date: $('date'),
    counter: $('counter'),
    card: $('card'),
    cardBody: $('cardBody'),
    quizBody: $('quizBody'),
    options: $('options'),
    ru_q: $('ru-q'), ru_a: $('ru-a'),
    en_q: $('en-q'), en_a: $('en-a'),
    de_q: $('de-q'), de_a: $('de-a'),
    meaning: $('meaning'),
    quizToggle: $('quizToggle'),
    overviewToggle: $('overviewToggle'),
    cardToggle: $('cardToggle'),
    prev: $('prev'),
    next: $('next'),
    today: $('todayBtn'),
    hint: $('hint'),
  };

  let PROVERBS = [];
  let offset = 0;            // days from today; 0 = today
  let selectedId = null;     // overrides the day's pick while exploring
  let quizActive = false;
  let userInteracted = false;

  // FNV-1a
  function hash(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
  }

  function dateForOffset(off) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + off);
    return d;
  }
  function dateKey(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function pickProverbForDate(off) {
    const d = dateForOffset(off);
    const idx = hash(dateKey(d)) % PROVERBS.length;
    return { proverb: PROVERBS[idx], date: d };
  }

  // The currently displayed proverb. If exploring, that overrides the day's.
  function currentProverb() {
    if (selectedId != null) {
      const p = PROVERBS.find(x => x.id === selectedId);
      if (p) return { proverb: p, date: dateForOffset(offset), exploring: true };
    }
    const { proverb, date } = pickProverbForDate(offset);
    return { proverb, date, exploring: false };
  }

  // ----- canvas math --------------------------------------------------
  function fitContain(vw, vh) {
    const imgRatio = IMAGE_W / IMAGE_H;
    const vRatio = vw / vh;
    let sx, sy;
    if (vRatio > imgRatio) { sy = 100; sx = (imgRatio / vRatio) * 100; }
    else                   { sx = 100; sy = (vRatio / imgRatio) * 100; }
    return { size: `${sx}% ${sy}%`, position: '50% 50%' };
  }

  // The current focus view (image-pixel coordinates of the rectangle to display).
  // Updated when proverb changes, when user wheel-zooms, or when user pans.
  let focusView = null; // { cx, cy, halfW, halfH }
  const ZOOM_MIN = 0.4;   // wider context (zoomed out)
  const ZOOM_MAX = 5.0;   // tighter detail (zoomed in)

  function defaultFocusFor(crop, vw, vh, pad = FOCUS_PAD) {
    const [x, y, w, h] = crop;
    let cw = w * (1 + pad);
    let ch = h * (1 + pad);
    const vRatio = vw / vh;
    const cRatio = cw / ch;
    if (cRatio < vRatio) cw = ch * vRatio;
    else                 ch = cw / vRatio;
    cw = Math.min(cw, IMAGE_W);
    ch = Math.min(ch, IMAGE_H);
    return { cx: x + w / 2, cy: y + h / 2, halfW: cw / 2, halfH: ch / 2, basePad: pad };
  }

  // Turn a focusView into background-size + background-position percentages.
  function fitFromView(view, vw, vh) {
    let cw = view.halfW * 2;
    let ch = view.halfH * 2;
    const vRatio = vw / vh;
    const cRatio = cw / ch;
    if (cRatio < vRatio) cw = ch * vRatio;
    else                 ch = cw / vRatio;
    cw = Math.min(cw, IMAGE_W);
    ch = Math.min(ch, IMAGE_H);
    let left = view.cx - cw / 2;
    let top  = view.cy - ch / 2;
    left = Math.max(0, Math.min(IMAGE_W - cw, left));
    top  = Math.max(0, Math.min(IMAGE_H - ch, top));
    const sizeX = (IMAGE_W / cw) * 100;
    const sizeY = (IMAGE_H / ch) * 100;
    const posX = (IMAGE_W - cw) > 0 ? (left / (IMAGE_W - cw)) * 100 : 50;
    const posY = (IMAGE_H - ch) > 0 ? (top  / (IMAGE_H - ch)) * 100 : 50;
    return { size: `${sizeX}% ${sizeY}%`, position: `${posX}% ${posY}%`, cw, ch, left, top };
  }

  // Zoom by `factor` (>1 zooms in, <1 zooms out), keeping the image point
  // under (clientX, clientY) anchored at the same screen position.
  function zoomAt(factor, clientX, clientY) {
    if (!focusView) return;
    const { proverb } = currentProverb();
    // Compute zoom limits from the proverb's default view dimensions.
    const base = defaultFocusFor(proverb.crop, window.innerWidth, window.innerHeight);
    const cur  = focusView.halfW / base.halfW; // 1 = default, <1 = zoomed in
    let next = cur / factor;
    next = Math.max(1 / ZOOM_MAX, Math.min(1 / ZOOM_MIN, next));
    const applied = cur / next; // actual factor after clamping
    if (Math.abs(applied - 1) < 0.001) return;
    const { ix, iy } = screenToImage(clientX, clientY);
    focusView.halfW = base.halfW * next;
    focusView.halfH = base.halfH * next;
    // Shift center so the cursor's image point stays under the cursor.
    focusView.cx = ix + (focusView.cx - ix) / applied;
    focusView.cy = iy + (focusView.cy - iy) / applied;
    paintCanvas('focus', proverb.crop, { resetView: false, animated: false });
  }

  function placeReticle(crop) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const imgRatio = IMAGE_W / IMAGE_H;
    const vRatio = vw / vh;
    let drawW, drawH, originX, originY;
    if (vRatio > imgRatio) {
      drawH = vh; drawW = vh * imgRatio;
      originX = (vw - drawW) / 2; originY = 0;
    } else {
      drawW = vw; drawH = vw / imgRatio;
      originX = 0; originY = (vh - drawH) / 2;
    }
    const [x, y, w, h] = crop;
    // Tight rectangle around the proverb subject, with a small breathing margin.
    const PAD = 6;
    const left   = originX + (x / IMAGE_W) * drawW - PAD;
    const top    = originY + (y / IMAGE_H) * drawH - PAD;
    const width  = (w / IMAGE_W) * drawW + PAD * 2;
    const height = (h / IMAGE_H) * drawH + PAD * 2;
    const r = els.reticle;
    r.style.left = left + 'px';
    r.style.top  = top + 'px';
    r.style.width = width + 'px';
    r.style.height = height + 'px';
  }

  function paintCanvas(state, crop, { resetView = true, animated = true } = {}) {
    const vw = window.innerWidth || document.documentElement.clientWidth || 1280;
    const vh = window.innerHeight || document.documentElement.clientHeight || 720;
    if (state === 'overview') {
      const target = fitContain(vw, vh);
      els.canvas.style.backgroundSize = target.size;
      els.canvas.style.backgroundPosition = target.position;
      placeReticle(crop);
      return;
    }
    // focus state — uses focusView.
    if (resetView || !focusView) {
      focusView = defaultFocusFor(crop, vw, vh);
    }
    if (!animated) {
      // Temporarily disable transition (used for live wheel/pan).
      els.canvas.style.transition = 'none';
    }
    const target = fitFromView(focusView, vw, vh);
    els.canvas.style.backgroundSize = target.size;
    els.canvas.style.backgroundPosition = target.position;
    if (!animated) {
      // Force a reflow so the inline override sticks, then clear it.
      void els.canvas.offsetHeight;
      els.canvas.style.transition = '';
    }
  }

  // ----- screen ↔ image coordinate transforms ------------------------
  // Reads the *currently rendered* background-size/position to invert.
  function canvasView() {
    const c = els.canvas;
    const rect = c.getBoundingClientRect();
    const cs = getComputedStyle(c);
    const bs = cs.backgroundSize.split(' ');
    const bp = cs.backgroundPosition.split(' ');
    const bsx = parseFloat(bs[0]) / 100;
    const bsy = parseFloat(bs[1] || bs[0]) / 100;
    const bpx = parseFloat(bp[0]) / 100;
    const bpy = parseFloat(bp[1] || bp[0]) / 100;
    const CW = rect.width, CH = rect.height;
    const rW = CW * bsx, rH = CH * bsy;
    const ox = (CW - rW) * bpx;
    const oy = (CH - rH) * bpy;
    return { rect, CW, CH, rW, rH, ox, oy };
  }

  function screenToImage(clientX, clientY) {
    const v = canvasView();
    const lx = clientX - v.rect.left - v.ox;
    const ly = clientY - v.rect.top  - v.oy;
    return {
      ix: (lx / v.rW) * IMAGE_W,
      iy: (ly / v.rH) * IMAGE_H,
    };
  }

  function imageRectToScreen([x, y, w, h]) {
    const v = canvasView();
    return {
      left:   v.rect.left + v.ox + (x / IMAGE_W) * v.rW,
      top:    v.rect.top  + v.oy + (y / IMAGE_H) * v.rH,
      width:  (w / IMAGE_W) * v.rW,
      height: (h / IMAGE_H) * v.rH,
    };
  }

  // ----- hit test (smallest containing rectangle wins) ---------------
  function hitTest(ix, iy) {
    if (ix < 0 || iy < 0 || ix >= IMAGE_W || iy >= IMAGE_H) return null;
    let best = null, bestArea = Infinity;
    for (const p of PROVERBS) {
      const [x, y, w, h] = p.crop;
      if (ix >= x && ix <= x + w && iy >= y && iy <= y + h) {
        const a = w * h;
        if (a < bestArea) { best = p; bestArea = a; }
      }
    }
    return best;
  }

  // ----- hover ring + tooltip ----------------------------------------
  let hoveredId = null;

  function showHover(p, clientX, clientY) {
    if (hoveredId === p.id) {
      // Just reposition tooltip.
      positionTooltip(clientX, clientY);
      return;
    }
    hoveredId = p.id;
    // Position ring on the proverb's image rect.
    const r = imageRectToScreen(p.crop);
    const ring = els.hoverRing;
    ring.style.left   = r.left + 'px';
    ring.style.top    = r.top  + 'px';
    ring.style.width  = r.width  + 'px';
    ring.style.height = r.height + 'px';
    ring.classList.add('visible');
    // Tooltip content.
    els.tooltip.innerHTML = `<span class="tt-num">№ ${p.id}</span>${escapeHtml(p.en)}`;
    els.tooltip.classList.add('visible');
    positionTooltip(clientX, clientY);
  }

  function positionTooltip(clientX, clientY) {
    const t = els.tooltip;
    const vw = window.innerWidth;
    // Clamp horizontal so it never spills off-screen.
    const halfW = t.offsetWidth / 2;
    const x = Math.max(halfW + 12, Math.min(vw - halfW - 12, clientX));
    t.style.left = x + 'px';
    t.style.top  = clientY + 'px';
  }

  function hideHover() {
    if (hoveredId === null) return;
    hoveredId = null;
    els.hoverRing.classList.remove('visible');
    els.tooltip.classList.remove('visible');
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  // ----- state machine ------------------------------------------------
  function setState(next) {
    if (els.body.dataset.state === next) return;
    els.body.dataset.state = next;
    els.overviewToggle.setAttribute('aria-pressed', next === 'overview' ? 'true' : 'false');
    els.overviewToggle.textContent = next === 'overview' ? 'focus' : 'explore the painting';
    hideHover();
    const { proverb } = currentProverb();
    paintCanvas(next, proverb.crop);
  }

  function toggleState() {
    setState(els.body.dataset.state === 'overview' ? 'focus' : 'overview');
  }

  // ----- card content -------------------------------------------------
  function analogText(p, lang) {
    if (!p.analog) return '';
    const v = p.analog[lang];
    return typeof v === 'string' ? v : '';
  }

  function fmtDate(d) {
    return d.toLocaleDateString(undefined, {
      weekday: 'long', day: 'numeric', month: 'long'
    });
  }

  function render() {
    const { proverb: p, date, exploring } = currentProverb();
    els.date.textContent = exploring ? 'exploring' : fmtDate(date);
    els.date.classList.toggle('exploring', exploring);
    els.counter.textContent = `№ ${p.id} / ${PROVERBS.length}`;
    els.ru_q.textContent = p.ru;
    els.en_q.textContent = p.en;
    els.de_q.textContent = p.de;
    els.ru_a.textContent = analogText(p, 'ru');
    els.en_a.textContent = analogText(p, 'en');
    els.de_a.textContent = analogText(p, 'de');
    els.meaning.textContent = p.meaning_en;
    if (quizActive) hideQuiz();
    const state = els.body.dataset.state;
    if (state === 'loading') {
      paintCanvas('overview', p.crop);
      // Use setTimeout (not rAF) so the boot animation runs even in
      // backgrounded/inactive tabs where rAF is throttled.
      setTimeout(() => setState('overview'), 40);
      setTimeout(() => setState('focus'), 1200);
    } else {
      paintCanvas(state, p.crop);
    }
  }

  function selectProverb(p) {
    selectedId = p.id;
    if (els.body.dataset.state !== 'focus') {
      // setState will repaint with currentProverb (which is now this one).
      render();
      setState('focus');
    } else {
      render();
    }
  }

  // ----- quiz ---------------------------------------------------------
  function buildQuiz() {
    const { proverb: correct } = currentProverb();
    const others = PROVERBS.filter(p => p.id !== correct.id);
    const seed = hash(String(correct.id) + 'q');
    const distractors = [];
    for (let i = 0; distractors.length < 2 && i < 200; i++) {
      const cand = others[(seed + i * 73) % others.length];
      if (!distractors.find(d => d.id === cand.id)) distractors.push(cand);
    }
    const choices = [correct, ...distractors];
    for (let i = choices.length - 1; i > 0; i--) {
      const j = (seed >>> (i * 3)) % (i + 1);
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    els.options.innerHTML = '';
    choices.forEach((c) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = c.en;
      btn.addEventListener('click', () => {
        if (li.classList.contains('correct') || li.classList.contains('wrong')) return;
        els.options.querySelectorAll('button').forEach(b => b.disabled = true);
        if (c.id === correct.id) {
          li.classList.add('correct');
        } else {
          li.classList.add('wrong');
          els.options.querySelectorAll('li').forEach((row) => {
            if (row.textContent === correct.en) row.classList.add('correct');
          });
        }
        setTimeout(() => { hideQuiz(); }, 900);
      });
      li.appendChild(btn);
      els.options.appendChild(li);
    });
  }

  function showQuiz() {
    quizActive = true;
    buildQuiz();
    els.cardBody.hidden = true;
    els.quizBody.hidden = false;
    els.quizToggle.textContent = 'reveal';
  }
  function hideQuiz() {
    quizActive = false;
    els.cardBody.hidden = false;
    els.quizBody.hidden = true;
    els.quizToggle.textContent = 'test me';
  }
  function toggleQuiz() {
    if (quizActive) hideQuiz(); else showQuiz();
  }

  // ----- wiring -------------------------------------------------------
  function markInteracted() {
    if (!userInteracted) {
      userInteracted = true;
      els.hint.style.opacity = '0';
    }
  }

  function go(deltaDays) {
    markInteracted();
    hideHover();
    selectedId = null; // arrow nav resets to the day's pick
    offset += deltaDays;
    render();
  }

  function handleTap(clientX, clientY) {
    markInteracted();
    const { ix, iy } = screenToImage(clientX, clientY);
    const hit = hitTest(ix, iy);
    if (hit) {
      selectProverb(hit);
    } else {
      toggleState();
    }
  }

  function wire() {
    els.prev.addEventListener('click', () => go(-1));
    els.next.addEventListener('click', () => go(+1));
    els.today.addEventListener('click', () => {
      markInteracted();
      hideHover();
      selectedId = null;
      offset = 0;
      render();
    });
    els.quizToggle.addEventListener('click', () => { markInteracted(); toggleQuiz(); });
    els.overviewToggle.addEventListener('click', () => { markInteracted(); toggleState(); });

    // Pointer: distinguish tap vs horizontal drag.
    let downX = null, downY = null, downTime = 0;
    els.canvas.addEventListener('pointerdown', (e) => {
      if (e.target !== els.canvas) return;
      downX = e.clientX; downY = e.clientY; downTime = performance.now();
    });
    window.addEventListener('pointerup', (e) => {
      if (downX === null) return;
      const dx = e.clientX - downX;
      const dy = e.clientY - downY;
      const dist = Math.hypot(dx, dy);
      const dt  = performance.now() - downTime;
      downX = null;
      if (dist < 12 && dt < 600) {
        handleTap(e.clientX, e.clientY);
      } else if (Math.abs(dx) > 70 && Math.abs(dy) < 60) {
        go(dx < 0 ? +1 : -1);
      }
    });

    // Hover: explore on devices that actually hover.
    const supportsHover = window.matchMedia('(hover: hover)').matches;
    if (supportsHover) {
      let throttled = false;
      els.canvas.addEventListener('mousemove', (e) => {
        if (throttled) return;
        throttled = true;
        setTimeout(() => { throttled = false; }, 16);
        const { ix, iy } = screenToImage(e.clientX, e.clientY);
        const hit = hitTest(ix, iy);
        if (hit) showHover(hit, e.clientX, e.clientY);
        else hideHover();
      });
      els.canvas.addEventListener('mouseleave', hideHover);
    }

    // Wheel zoom (focus state only). Trackpad pinch fires wheel with ctrlKey.
    els.canvas.addEventListener('wheel', (e) => {
      if (els.body.dataset.state !== 'focus' || !focusView) return;
      e.preventDefault();
      // Delta normalized: deltaY positive = scroll down = zoom out.
      const intensity = e.ctrlKey ? 0.012 : 0.0022; // pinch is more aggressive
      const factor = Math.exp(-e.deltaY * intensity);
      zoomAt(factor, e.clientX, e.clientY);
    }, { passive: false });

    // Double-click resets zoom to default focus on the current proverb.
    els.canvas.addEventListener('dblclick', () => {
      if (els.body.dataset.state !== 'focus') return;
      const { proverb } = currentProverb();
      focusView = defaultFocusFor(proverb.crop, window.innerWidth, window.innerHeight);
      paintCanvas('focus', proverb.crop, { resetView: false, animated: true });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft')  go(-1);
      else if (e.key === 'ArrowRight') go(+1);
      else if (e.key === ' ' || e.key === 'Enter') {
        if (document.activeElement === document.body) {
          e.preventDefault(); toggleQuiz();
        }
      } else if (e.key === 'f' || e.key === 'F') toggleState();
      else if (e.key === 'Escape') {
        if (selectedId != null) { selectedId = null; render(); }
        else if (els.body.dataset.state === 'focus') setState('overview');
      }
      else if (e.key === 't' || e.key === 'T') {
        selectedId = null; offset = 0; render();
      }
    });

    window.addEventListener('resize', () => {
      hideHover();
      const state = els.body.dataset.state;
      const { proverb } = currentProverb();
      paintCanvas(state, proverb.crop);
    });
  }

  async function boot() {
    try {
      const res = await fetch('proverbs.json', { cache: 'force-cache' });
      const data = await res.json();
      PROVERBS = data.proverbs;
      wire();
      render();
    } catch (err) {
      document.body.textContent = 'Failed to load proverbs: ' + err.message;
    }
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  boot();
})();
