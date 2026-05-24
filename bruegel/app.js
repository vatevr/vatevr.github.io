(() => {
  'use strict';

  const IMAGE_W = 5649;
  const IMAGE_H = 4000;

  // How much context around the proverb rect we show in focus mode.
  // Higher = wider context, lower = tighter zoom.
  const FOCUS_PAD = 0.7;

  const $ = (id) => document.getElementById(id);
  const els = {
    body: document.body,
    canvas: $('canvas'),
    reticle: $('reticle'),
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
  let offset = 0;        // days from today; 0 = today
  let quizActive = false;
  let userInteracted = false;

  // FNV-1a hash
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

  function pickProverb(off) {
    const d = dateForOffset(off);
    const idx = hash(dateKey(d)) % PROVERBS.length;
    return { proverb: PROVERBS[idx], date: d, idx };
  }

  // ----- canvas math ---------------------------------------------------
  // "Contain" the painting into the viewport (overview state).
  function fitContain(vw, vh) {
    const imgRatio = IMAGE_W / IMAGE_H;
    const vRatio = vw / vh;
    let sx, sy;
    if (vRatio > imgRatio) {
      // Viewport wider than image — fit height.
      sy = 100;
      sx = (imgRatio / vRatio) * 100;
    } else {
      sx = 100;
      sy = (vRatio / imgRatio) * 100;
    }
    return { size: `${sx}% ${sy}%`, position: '50% 50%' };
  }

  // "Cover" a target rectangle with the viewport (focus state).
  function fitFocus(crop, vw, vh, pad = FOCUS_PAD) {
    const [x, y, w, h] = crop;
    const cx = x + w / 2;
    const cy = y + h / 2;
    let cw = w * (1 + pad);
    let ch = h * (1 + pad);
    const vRatio = vw / vh;
    const cRatio = cw / ch;
    if (cRatio < vRatio) cw = ch * vRatio;
    else ch = cw / vRatio;
    cw = Math.min(cw, IMAGE_W);
    ch = Math.min(ch, IMAGE_H);
    let left = cx - cw / 2;
    let top = cy - ch / 2;
    left = Math.max(0, Math.min(IMAGE_W - cw, left));
    top  = Math.max(0, Math.min(IMAGE_H - ch, top));
    const sizeX = (IMAGE_W / cw) * 100;
    const sizeY = (IMAGE_H / ch) * 100;
    const posX = (IMAGE_W - cw) > 0 ? (left / (IMAGE_W - cw)) * 100 : 50;
    const posY = (IMAGE_H - ch) > 0 ? (top  / (IMAGE_H - ch)) * 100 : 50;
    return { size: `${sizeX}% ${sizeY}%`, position: `${posX}% ${posY}%`, left, top, cw, ch };
  }

  // Position the reticle ring around the proverb subject when in overview.
  // In overview the painting is letterboxed; compute the painting's screen rect
  // then place the ring on the actual crop area.
  function placeReticle(crop) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const imgRatio = IMAGE_W / IMAGE_H;
    const vRatio = vw / vh;
    let drawW, drawH, originX, originY;
    if (vRatio > imgRatio) {
      drawH = vh;
      drawW = vh * imgRatio;
      originX = (vw - drawW) / 2;
      originY = 0;
    } else {
      drawW = vw;
      drawH = vw / imgRatio;
      originX = 0;
      originY = (vh - drawH) / 2;
    }
    const [x, y, w, h] = crop;
    const cx = (x + w / 2) / IMAGE_W * drawW + originX;
    const cy = (y + h / 2) / IMAGE_H * drawH + originY;
    // Reticle diameter proportional to the larger of w/h on screen.
    const wOnScreen = (w / IMAGE_W) * drawW;
    const hOnScreen = (h / IMAGE_H) * drawH;
    const d = Math.max(wOnScreen, hOnScreen) * 1.4;
    const r = els.reticle;
    r.style.left = (cx - d / 2) + 'px';
    r.style.top  = (cy - d / 2) + 'px';
    r.style.width = d + 'px';
    r.style.height = d + 'px';
  }

  function paintCanvas(state, crop) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const target = (state === 'overview') ? fitContain(vw, vh) : fitFocus(crop, vw, vh);
    els.canvas.style.backgroundSize = target.size;
    els.canvas.style.backgroundPosition = target.position;
    if (state === 'overview') placeReticle(crop);
  }

  // ----- view state ---------------------------------------------------
  function setState(next) {
    const current = els.body.dataset.state;
    if (current === next) return;
    els.body.dataset.state = next;
    els.overviewToggle.setAttribute('aria-pressed', next === 'overview' ? 'true' : 'false');
    els.overviewToggle.textContent = next === 'overview' ? 'focus' : 'show full painting';
    const { proverb } = pickProverb(offset);
    paintCanvas(next, proverb.crop);
  }

  function toggleState() {
    const s = els.body.dataset.state;
    setState(s === 'overview' ? 'focus' : 'overview');
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

  function render(reason = 'init') {
    const { proverb: p, date } = pickProverb(offset);
    els.date.textContent = fmtDate(date);
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
      // First paint: start at overview, then ease into focus.
      paintCanvas('overview', p.crop);
      requestAnimationFrame(() => {
        setState('overview');
        // Hold the wide shot briefly, then zoom in.
        setTimeout(() => setState('focus'), 1100);
      });
    } else {
      // Always update both reticle (for overview) and canvas (current state).
      paintCanvas(state, p.crop);
    }
  }

  // ----- quiz ---------------------------------------------------------
  function buildQuiz() {
    const { proverb: correct } = pickProverb(offset);
    const others = PROVERBS.filter(p => p.id !== correct.id);
    const seed = hash(dateKey(dateForOffset(offset)) + 'q');
    const distractors = [];
    for (let i = 0; distractors.length < 2 && i < 100; i++) {
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
    if (quizActive) hideQuiz();
    else showQuiz();
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
    offset += deltaDays;
    render('nav');
  }

  function wire() {
    els.prev.addEventListener('click', () => go(-1));
    els.next.addEventListener('click', () => go(+1));
    els.today.addEventListener('click', () => { markInteracted(); offset = 0; render('today'); });
    els.quizToggle.addEventListener('click', () => { markInteracted(); toggleQuiz(); });
    els.overviewToggle.addEventListener('click', () => { markInteracted(); toggleState(); });

    // Tap the painting toggles state.
    els.canvas.addEventListener('click', () => { markInteracted(); toggleState(); });

    // Drag horizontally to scrub through days.
    let dragX = null;
    els.canvas.addEventListener('pointerdown', (e) => {
      if (e.target !== els.canvas) return;
      dragX = e.clientX;
    });
    window.addEventListener('pointerup', (e) => {
      if (dragX === null) return;
      const dx = e.clientX - dragX;
      dragX = null;
      if (Math.abs(dx) > 70) go(dx < 0 ? +1 : -1);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(+1);
      else if (e.key === ' ' || e.key === 'Enter') {
        if (document.activeElement === document.body) {
          e.preventDefault();
          toggleQuiz();
        }
      } else if (e.key === 'f' || e.key === 'F') toggleState();
      else if (e.key === 't' || e.key === 'T') { offset = 0; render('today'); }
    });

    window.addEventListener('resize', () => {
      const state = els.body.dataset.state;
      const { proverb } = pickProverb(offset);
      paintCanvas(state, proverb.crop);
    });
  }

  async function boot() {
    try {
      const res = await fetch('proverbs.json', { cache: 'force-cache' });
      const data = await res.json();
      PROVERBS = data.proverbs;
      wire();
      render('boot');
    } catch (err) {
      document.body.textContent = 'Failed to load proverbs: ' + err.message;
    }
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  boot();
})();
