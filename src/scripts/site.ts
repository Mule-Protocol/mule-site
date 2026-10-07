import { lifecycle } from '../data/lifecycle';

const root = document.documentElement;
root.dataset.js = 'true';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const motionButton = document.querySelector<HTMLButtonElement>('#motionToggle')!;
let paused = reduced.matches;
let cleanupMotion: (() => void) | undefined;
let motionGeneration = 0;
let motionObserver: IntersectionObserver | undefined;
let cleanupTrail: (() => void) | undefined;
const section = document.querySelector<HTMLElement>('#lifecycle');
const staticSteps = document.querySelector<HTMLOListElement>('.lifecycle-static');
const mobileScene = matchMedia('(max-width: 767px)');
let currentStep = 0;
let pausedAnchor: { step: number; y: number } | null = null;

const menu = document.querySelector<HTMLDialogElement>('#mobileMenu')!;
const openMenu = document.querySelector<HTMLButtonElement>('#menuOpen')!;
openMenu.addEventListener('click', () => { menu.showModal(); openMenu.setAttribute('aria-expanded', 'true'); });
function closeMenu() {
  openMenu.setAttribute('aria-expanded', 'false');
  menu.close();
}
document.querySelector('#menuClose')?.addEventListener('click', closeMenu);
menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
menu.addEventListener('cancel', event => { event.preventDefault(); closeMenu(); });
menu.addEventListener('close', () => openMenu.setAttribute('aria-expanded', 'false'));

const progress = document.querySelector<HTMLElement>('#progress')!;
let progressPending = false;
function updateProgress() {
  if (progressPending) return;
  progressPending = true;
  requestAnimationFrame(() => {
    const span = root.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${span > 0 ? Math.round(scrollY / span * 40) / 40 : 0})`;
    progressPending = false;
  });
}
addEventListener('scroll', updateProgress, { passive: true });
addEventListener('resize', updateProgress);

async function initMotion(generation: number, restore: { step: number; y: number } | null = null) {
  if (!section) return;
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
  if (generation !== motionGeneration || paused || reduced.matches) return;
  const readingY = scrollY;
  const restoreStep = restore && Math.abs(readingY - restore.y) < 2 ? restore.step : null;
  gsap.registerPlugin(ScrollTrigger);
  root.classList.add('motion-ready');
  const stage = document.querySelector<SVGElement>('#stage')!;
  const mule = document.querySelector<SVGElement>('#lcMule')!;
  const inner = document.querySelector<SVGElement>('#lcMuleInner')!;
  const rail = document.querySelector('#lcRail')!.children;
  const stations = document.querySelector('#stations')!.children;
  let lastStep = -1;
  let disposed = false;
  function render(p: number) {
    if (disposed) return;
    const step = Math.min(4, Math.floor(p * 5));
    const local = p * 5 - step;
    const movement = step < 4 ? Math.max(0, (local - 0.55) / 0.45) : 0;
    const x = 100 + step * 180 + movement * 180 - 112;
    mule.setAttribute('transform', `translate(${x.toFixed(1)} 95) scale(0.75)`);
    // A close camera follows the mule on small screens; desktop keeps the whole track.
    stage.setAttribute('viewBox', mobileScene.matches ? `${(x - 5).toFixed(1)} 72 270 198` : '0 0 960 300');
    inner.classList.toggle('walking', step === 2 || (movement > 0 && movement < 1));
    if (lastStep === step) return;
    lastStep = step;
    currentStep = step;
    stage.dataset.step = String(step + 1);
    document.querySelector('#lcNum')!.textContent = `0${step + 1}`;
    document.querySelector('#lcLabel')!.textContent = lifecycle[step].label;
    document.querySelector('#lcText')!.textContent = lifecycle[step].caption;
    document.querySelector('#lcAnnotation')!.textContent = lifecycle[step].annotation;
    Array.from(rail).forEach((item, i) => {
      item.className = i <= step ? (i === step ? 'on cur' : 'on') : '';
      if (i === step) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
      stations[i].setAttribute('class', `station${i <= step ? (i === step ? ' cur' : ' on') : ''}`);
    });
  }
  const scrollTrigger = ScrollTrigger.create({
    trigger: section,
    start: 'top 56px',
    end: 'bottom bottom',
    onUpdate: self => render(self.progress),
    onRefresh: self => render(self.progress),
  });
  const updateCamera = () => render(scrollTrigger.progress);
  mobileScene.addEventListener('change', updateCamera);
  render(scrollTrigger.progress);
  cleanupMotion = () => {
    disposed = true;
    // The layout is CSS sticky, so do not let GSAP restore an old scroll position.
    scrollTrigger.kill(false);
    delete section.dataset.animated;
    mobileScene.removeEventListener('change', updateCamera);
    root.classList.remove('motion-ready');
    inner.classList.remove('walking');
    updateProgress();
  };
  ScrollTrigger.refresh();
  if (restoreStep !== null) {
    const p = (restoreStep + 0.25) / 5;
    scrollTrigger.scroll(scrollTrigger.start + (scrollTrigger.end - scrollTrigger.start) * p);
  } else scrollTrigger.scroll(readingY);
  ScrollTrigger.update();
  render(scrollTrigger.progress);
  section.dataset.animated = 'true';
  updateProgress();
}

function readingStep(): number | null {
  if (!section || !staticSteps) return null;
  const bounds = section.getBoundingClientRect();
  if (bounds.top >= innerHeight || bounds.bottom <= 72) return null;
  if (root.classList.contains('motion-ready')) return currentStep;
  // Near the document end the browser may clamp scrollY before the last card reaches the top.
  if (pausedAnchor && Math.abs(scrollY - pausedAnchor.y) < 2) return pausedAnchor.step;
  // On resume, respect any reading/scrolling done in the static list while paused.
  const cards = Array.from(staticSteps.children);
  return cards.reduce((best, card, index) => Math.abs(card.getBoundingClientRect().top - 72) < Math.abs(cards[best].getBoundingClientRect().top - 72) ? index : best, 0);
}

function setMotion(preservePosition = true) {
  const anchor = preservePosition ? readingStep() : null;
  pausedAnchor = null;
  motionGeneration++;
  motionObserver?.disconnect();
  cleanupTrail?.();
  cleanupMotion?.();
  cleanupMotion = undefined;
  const off = paused || reduced.matches;
  root.dataset.motion = off ? 'off' : 'on';
  motionButton.setAttribute('aria-pressed', String(off));
  motionButton.disabled = reduced.matches;
  root.classList.toggle('motion-ready', !off && !!section);
  staticSteps?.classList.toggle('sr-only', !off);
  document.dispatchEvent(new CustomEvent('mule:motion', { detail: { off } }));
  let restore: { step: number; y: number } | null = null;
  if (anchor !== null && section && staticSteps) {
    currentStep = anchor;
    if (off) {
      const item = staticSteps.children[anchor];
      scrollTo({ top: scrollY + item.getBoundingClientRect().top - 72, behavior: 'instant' });
      pausedAnchor = { step: anchor, y: scrollY };
    } else {
      const start = scrollY + section.getBoundingClientRect().top - 56;
      const span = section.offsetHeight - innerHeight + 56;
      scrollTo({ top: start + span * ((anchor + 0.25) / 5), behavior: 'instant' });
      restore = { step: anchor, y: scrollY };
    }
  }
  if (!off) {
    cleanupTrail = initTrail();
    const generation = motionGeneration;
    // Reserve the sticky layout now; fetch the scroll engine only on approach.
    motionObserver = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      motionObserver?.disconnect();
      void initMotion(generation, restore).catch(() => { paused = true; setMotion(); });
    });
    if (section) motionObserver.observe(section);
  }
  updateProgress();
}
motionButton.addEventListener('click', () => { paused = !paused; setMotion(); });
reduced.addEventListener('change', () => { paused = reduced.matches; setMotion(); });

function initTrail(): () => void {
  const canvas = document.querySelector<HTMLCanvasElement>('#trail')!;
  if (!matchMedia('(pointer: fine)').matches) return () => {};
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const pitch = 24, life = 650;
  const dots = new Map<string, { x: number; y: number; t: number }>();
  let head: { x: number; y: number; t: number } | null = null;
  let last: { x: number; y: number } | null = null;
  let raf = 0;
  const resize = () => {
    const dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  function draw(now: number) {
    if (!ctx) return;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    dots.forEach((dot, key) => {
      const age = (now - dot.t) / life;
      if (age >= 1) { dots.delete(key); return; }
      const level = Math.ceil((1 - age) * 4) / 4;
      ctx.globalAlpha = .6 * level;
      ctx.fillStyle = '#0E0E0E';
      ctx.beginPath();
      ctx.arc(dot.x * pitch - scrollX, dot.y * pitch - scrollY, 1.6 + level * 1.2, 0, Math.PI * 2);
      ctx.fill();
    });
    if (head && now - head.t < life) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#FF4F00';
      ctx.fillRect(head.x * pitch - scrollX - 3.5, head.y * pitch - scrollY - 3.5, 7, 7);
    }
    ctx.globalAlpha = 1;
    raf = dots.size || (head && now - head.t < life) ? requestAnimationFrame(draw) : 0;
  }
  const move = (event: PointerEvent) => {
    const now = performance.now();
    const x = Math.round((event.clientX + scrollX) / pitch);
    const y = Math.round((event.clientY + scrollY) / pitch);
    const count = last ? Math.max(Math.abs(x - last.x), Math.abs(y - last.y)) : 0;
    if (last && count) {
      for (let i = 1; i <= Math.min(count, 100); i++) {
        const gx = last.x + Math.round((x - last.x) * i / count);
        const gy = last.y + Math.round((y - last.y) * i / count);
        dots.set(`${gx},${gy}`, { x: gx, y: gy, t: now });
      }
    } else dots.set(`${x},${y}`, { x, y, t: now });
    last = { x, y }; head = { x, y, t: now };
    if (!raf) raf = requestAnimationFrame(draw);
  };
  const leave = () => { head = null; last = null; };
  const scroll = () => { last = null; };
  resize();
  addEventListener('resize', resize);
  addEventListener('pointermove', move, { passive: true });
  addEventListener('scroll', scroll, { passive: true });
  root.addEventListener('pointerleave', leave);
  return () => {
    cancelAnimationFrame(raf);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    removeEventListener('resize', resize);
    removeEventListener('pointermove', move);
    removeEventListener('scroll', scroll);
    root.removeEventListener('pointerleave', leave);
  };
}

setMotion(false);
