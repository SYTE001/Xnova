/**
 * Main Application Script — Alif Bayu Y. Portfolio
 * Vintage Ink Edition: boot choreography, split reveals, unified rAF scheduler,
 * mobile drawer, scrollspy, progress bar, marquees, magnetic buttons, contact.
 */

import { SITE_CONFIG } from './site.config.js';

/* ------------------------------------------------------------------ *
 * Environment & helpers
 * ------------------------------------------------------------------ */
const doc = document.documentElement;
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/* Keep long-lived observers reachable: a locally-scoped IntersectionObserver
   can be garbage-collected after its init function returns, killing all
   future callbacks. */
const PERSISTENT_OBSERVERS = [];

/* ------------------------------------------------------------------ *
 * 1. Dynamic year
 * ------------------------------------------------------------------ */
function initYear() {
  const value = String(new Date().getFullYear());
  $$('[data-year]').forEach((el) => { el.textContent = value; });
  const legacy = $('#current-year');
  if (legacy) legacy.textContent = value;
}

/* ------------------------------------------------------------------ *
 * 2. Hero clock (Asia/Jakarta)
 * ------------------------------------------------------------------ */
function initClock() {
  const clock = $('#hero-clock');
  if (!clock) return;

  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const tick = () => {
    const now = new Date();
    clock.textContent = fmt.format(now);
    clock.setAttribute('datetime', now.toISOString());
  };

  tick();
  setInterval(tick, 1000);
}

/* ------------------------------------------------------------------ *
 * 3. Text splitting (word masks + hero char typesetting)
 * ------------------------------------------------------------------ */
function splitWords(el) {
  const words = el.textContent.split(/\s+/).filter(Boolean);
  el.textContent = '';
  el.setAttribute('aria-label', words.join(' '));

  words.forEach((word, i) => {
    const w = document.createElement('span');
    w.className = 'word';
    w.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('span');
    inner.className = 'word-inner';
    inner.textContent = word;
    inner.style.setProperty('--wd', `${i * 62}ms`);
    w.appendChild(inner);
    el.appendChild(w);
    el.appendChild(document.createTextNode(' '));
  });
}

function splitChars(el, baseDelay, wave, startIndex) {
  const text = el.textContent;
  el.textContent = '';
  el.setAttribute('aria-label', text);

  let index = startIndex;
  [...text].forEach((ch) => {
    if (ch.trim() === '') {
      el.appendChild(document.createTextNode(' '));
      return;
    }
    const s = document.createElement('span');
    s.className = 'char';
    s.textContent = ch;
    s.setAttribute('aria-hidden', 'true');
    s.style.setProperty('--cd', `${Math.round(baseDelay + index * wave)}ms`);
    el.appendChild(s);
    index += 1;
  });
  return index;
}

function initSplitting() {
  $$('[data-split]').forEach((el) => {
    if (el.getAttribute('data-split') === 'chars') return; // handled in the hero group pass
    splitWords(el);
  });

  const heroGroup = $('[data-char-group="hero"]');
  if (heroGroup) {
    let index = 0;
    $$('[data-split="chars"]', heroGroup).forEach((el) => {
      index = splitChars(el, 180, 30, index);
    });
  }
}

/* ------------------------------------------------------------------ *
 * 4. Intro boot controller
 * ------------------------------------------------------------------ */
function revealHero() {
  $$('.hero [data-reveal]').forEach((el) => el.classList.add('is-inview'));
}

function initBoot() {
  const boot = $('#boot');
  const counter = $('#boot-counter');

  const release = () => {
    window.__introDone = true;
    document.body.classList.add('is-ready');
    revealHero();
    if (boot) boot.remove();
  };

  if (REDUCED || !boot) {
    release();
    return;
  }

  // Counter: 000 → 100 in BOOT_MIN ms, ease 1-(1-t)^2.2
  const BOOT_MIN = 900;
  const t0 = performance.now();
  const ease = (t) => 1 - Math.pow(1 - t, 2.2);

  requestAnimationFrame(function tickFrame(now) {
    const p = clamp((now - t0) / BOOT_MIN, 0, 1);
    if (counter) counter.textContent = String(Math.round(ease(p) * 100)).padStart(3, '0');
    if (p < 1) {
      requestAnimationFrame(tickFrame);
      return;
    }
    // Panels split; hero reveal fires synchronously for deterministic timing
    window.__introDone = true;
    boot.classList.add('is-open');
    document.body.classList.add('is-ready');
    revealHero();
    window.setTimeout(() => boot.classList.add('is-done'), 900);
  });

  // Safety valve: never trap the page behind the intro
  window.setTimeout(() => {
    if (!document.body.classList.contains('is-ready')) release();
  }, 2600);
}

/* ------------------------------------------------------------------ *
 * 5. Mobile drawer
 * ------------------------------------------------------------------ */
function initDrawer() {
  const toggle = $('.mobile-nav-toggle');
  const nav = $('#site-nav');
  if (!toggle || !nav) return;

  const isOpen = () => document.body.classList.contains('menu-open');

  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    document.body.classList.toggle('menu-open', open);
    // Contain focus/screen-reader traversal to the drawer while open
    ['#main-content', '.site-footer', '#back-to-top'].forEach((sel) => {
      const el = document.querySelector(sel);
      if (el && 'inert' in el) el.inert = open;
    });
  };

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    setMenu(!isOpen());
    if (isOpen()) {
      const first = $('.nav-links a', nav);
      if (first) first.focus({ preventScroll: true });
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) {
      setMenu(false);
      toggle.focus({ preventScroll: true });
    }
  });

  $$('.nav-links a', nav).forEach((link) => {
    link.addEventListener('click', () => setMenu(false));
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1000 && isOpen()) setMenu(false);
  }, { passive: true });
}

/* ------------------------------------------------------------------ *
 * 6. Scroll: header state, progress bar, back-to-top, hero fade
 * ------------------------------------------------------------------ */
function initScroll() {
  const header = $('#site-header');
  const progress = $('#progress-bar');
  const backToTop = $('#back-to-top');
  const heroInner = $('.hero-inner');

  let lastY = window.scrollY;
  let ticking = false;

  const frame = () => {
    const y = window.scrollY;

    if (header) {
      header.classList.toggle('is-stuck', y > 30);
      if (y > lastY + 2 && y > 520) header.classList.add('is-hidden');
      else if (y < lastY - 2 || y <= 520) header.classList.remove('is-hidden');
    }

    const max = doc.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;

    if (backToTop) backToTop.classList.toggle('is-visible', y > window.innerHeight * 0.9);

    if (heroInner && !REDUCED) {
      const p = clamp(y / (window.innerHeight * 0.85), 0, 1);
      heroInner.style.opacity = String(1 - p * 0.9);
      heroInner.style.transform = `translate3d(0, ${-40 * p}px, 0)`;
    }

    lastY = y;
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(frame);
    }
  }, { passive: true });

  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
    });
  }

  frame();
}

/* ------------------------------------------------------------------ *
 * 7. Scrollspy
 * ------------------------------------------------------------------ */
function initScrollspy() {
  const links = $$('.nav-link[data-spy]');
  if (!links.length || !('IntersectionObserver' in window)) return;

  const byId = {};
  links.forEach((link) => { byId[link.getAttribute('data-spy')] = link; });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const link = byId[entry.target.id];
      if (!link) return;
      if (entry.isIntersecting) {
        links.forEach((l) => l.classList.remove('is-active'));
        link.classList.add('is-active');
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  PERSISTENT_OBSERVERS.push(io);

  Object.keys(byId).forEach((id) => {
    const section = document.getElementById(id);
    if (section) io.observe(section);
  });
}

/* ------------------------------------------------------------------ *
 * 8. Scroll reveals (IntersectionObserver, fire once)
 * ------------------------------------------------------------------ */
function initReveals() {
  const staggerGroups = $$('[data-stagger]');
  staggerGroups.forEach((group) => {
    const step = parseInt(group.getAttribute('data-stagger'), 10) || 90;
    $$('[data-reveal]', group).forEach((el, i) => {
      el.style.setProperty('--rd', `${i * step}ms`);
    });
  });

  const revealEls = $$('[data-reveal]').filter((el) => !el.closest('.hero'));
  const splitEls = $$('[data-split]').filter((el) => !el.closest('.hero'));

  if (REDUCED || !('IntersectionObserver' in window)) {
    [...revealEls, ...splitEls].forEach((el) => el.classList.add('is-inview'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-inview');
      io.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  PERSISTENT_OBSERVERS.push(io);

  [...revealEls, ...splitEls].forEach((el) => io.observe(el));
}

/* ------------------------------------------------------------------ *
 * 9. Unified rAF scheduler: parallax, image drift, rotation, marquees
 * ------------------------------------------------------------------ */
function initScheduler() {
  if (REDUCED) return;

  const parallaxEls = $$('[data-parallax]').map((el) => ({
    el,
    speed: parseFloat(el.getAttribute('data-parallax')) || 0.12,
    top: 0,
    height: 0,
    current: 0,
  }));

  const pyImgs = $$('img[data-py]').map((img) => ({
    img,
    speed: parseFloat(img.getAttribute('data-py')) || 0.1,
    wrap: img.closest('.card-featured-media') || img.parentElement,
    top: 0,
    height: 0,
    maxShift: 0,
  }));

  const rotEls = $$('[data-rot]').map((el) => ({
    el,
    deg: parseFloat(el.getAttribute('data-rot')) || 9,
    top: 0,
    height: 0,
  }));

  const marquees = $$('[data-marquee]').map((track) => ({
    track,
    dir: parseFloat(track.getAttribute('data-dir')) || -1,
    speed: parseFloat(track.getAttribute('data-speed')) || 0.4,
    unit: 0,
    pos: 0,
    boost: 0,
  }));

  const measure = () => {
    const y = window.scrollY;
    const measureEl = (item, el) => {
      const r = el.getBoundingClientRect();
      item.top = r.top + y;
      item.height = r.height;
    };
    parallaxEls.forEach((item) => measureEl(item, item.el));
    pyImgs.forEach((item) => {
      measureEl(item, item.wrap);
      // scale(1.1) leaves ~5% overflow per edge; keep the drift inside it
      item.maxShift = item.height * 0.04;
    });
    rotEls.forEach((item) => measureEl(item, item.el));
    marquees.forEach((item) => {
      if (item.track.children.length) item.unit = item.track.children[0].offsetWidth;
    });
  };

  measure();
  window.addEventListener('resize', measure, { passive: true });
  window.addEventListener('load', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  let prevY = window.scrollY;
  let running = !document.hidden;

  const loop = () => {
    if (!running) return;

    const y = window.scrollY;
    const vh = window.innerHeight;
    const vel = y - prevY;
    prevY = y;

    // Parallax floats: drift relative to viewport centre, lerped
    parallaxEls.forEach((item) => {
      const target = (y + vh / 2 - (item.top + item.height / 2)) * item.speed;
      item.current += (target - item.current) * 0.12;
      item.el.style.transform = `translate3d(0, ${item.current.toFixed(2)}px, 0)`;
    });

    // In-frame image drift, clamped to the scale headroom, written into --py
    pyImgs.forEach((item) => {
      const target = clamp(
        (y + vh / 2 - (item.top + item.height / 2)) * item.speed,
        -item.maxShift,
        item.maxShift
      );
      item.img.style.setProperty('--py', `${target.toFixed(1)}px`);
    });

    // Scroll rotation: −deg → +deg×0.44 across the element's viewport span
    rotEls.forEach((item) => {
      const p = clamp((y + vh - item.top) / (vh + item.height), 0, 1);
      const angle = -item.deg + item.deg * 1.44 * p;
      item.el.style.transform = `rotate(${angle.toFixed(2)}deg)`;
    });

    // Velocity-reactive marquees, seamless wrap at unit width
    marquees.forEach((item) => {
      if (!item.unit) return;
      const targetBoost = clamp(Math.abs(vel), 0, 16);
      item.boost += (targetBoost - item.boost) * 0.08;
      item.pos += (item.speed + item.boost) * item.dir;
      const offset = ((item.pos % item.unit) + item.unit) % item.unit;
      item.track.style.transform = `translate3d(${-offset.toFixed(2)}px, 0, 0)`;
    });

    requestAnimationFrame(loop);
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      running = false;
    } else if (!running) {
      running = true;
      prevY = window.scrollY;
      requestAnimationFrame(loop);
    }
  });

  requestAnimationFrame(loop);
}

/* ------------------------------------------------------------------ *
 * 10. Magnetic buttons (fine pointers only)
 * ------------------------------------------------------------------ */
function initMagnetic() {
  if (!FINE_POINTER || REDUCED) return;

  $$('.btn, .mail-cta').forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      const dx = clamp((e.clientX - (r.left + r.width / 2)) * 0.22, -10, 10);
      const dy = clamp((e.clientY - (r.top + r.height / 2)) * 0.22, -8, 8);
      btn.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });
}

/* ------------------------------------------------------------------ *
 * 11. Contact wiring (single source: SITE_CONFIG)
 * ------------------------------------------------------------------ */
function initContact() {
  const email = (SITE_CONFIG.contact && SITE_CONFIG.contact.email ? SITE_CONFIG.contact.email : '').trim();
  const mailCta = $('#signal-action-btn');
  if (mailCta && email) {
    mailCta.setAttribute('href', `mailto:${email}`);
    const addr = $('[data-email]', mailCta);
    if (addr) addr.textContent = email;
  }
}

/* ------------------------------------------------------------------ *
 * Boot
 * ------------------------------------------------------------------ */
initYear();
initClock();
initSplitting();
initBoot();
initDrawer();
initScroll();
initScrollspy();
initReveals();
initScheduler();
initMagnetic();
initContact();
