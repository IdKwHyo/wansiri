import { Lenis } from './vendor/lenis/lenis.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
const motionAvailable = Boolean(gsap && ScrollTrigger);
if (motionAvailable) gsap.registerPlugin(ScrollTrigger);

// One instance owns scrolling. Touch and keyboard retain their native behavior.
const lenis = new Lenis({ autoRaf: false, smoothWheel: motionAvailable && !reduceMotion.matches, syncTouch: false, lerp: 0.085, anchors: false });
const tick = time => lenis.raf(time * 1000);
if (motionAvailable) {
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
}

let motionContext;
let fabricScene;
let fabricGeneration = 0;
async function configureFabric() {
  const generation = ++fabricGeneration;
  fabricScene?.dispose();
  fabricScene = null;
  if (reduceMotion.matches || !motionAvailable || navigator.connection?.saveData) return;
  try {
    const { createFabricDepth } = await import('./fabric-depth.js?v=4');
    if (generation !== fabricGeneration || reduceMotion.matches) return;
    const scene = await createFabricDepth(document.querySelector('.ambient-scene'), { gsap, ScrollTrigger, reducedMotion: reduceMotion });
    if (generation !== fabricGeneration || reduceMotion.matches) scene?.dispose();
    else fabricScene = scene;
  } catch {
    // The original photograph remains visible if WebGL cannot initialize.
  }
}
let heroHasRevealed = false;
let contactHasRevealed = false;
function configureMotion() {
  motionContext?.revert();
  lenis.options.smoothWheel = motionAvailable && !reduceMotion.matches;
  if (reduceMotion.matches) lenis.scrollTo(window.scrollY, { immediate: true });
  if (reduceMotion.matches || !motionAvailable) return;
  motionContext = gsap.context(() => {
    if (!heroHasRevealed) {
      heroHasRevealed = true;
      gsap.from('.title-line', { yPercent: 110, stagger: 0.04, duration: 1.15, ease: 'power3.out', clearProps: 'transform' });
    }
    gsap.fromTo('.portrait img', { scale: 1 }, {
      scale: 1.03, ease: 'none',
      scrollTrigger: { trigger: '.surgeon-visual', start: 'top 90%', end: 'bottom 30%', scrub: 1 },
    });
    if (!contactHasRevealed) {
      gsap.from('.contact-line', {
        yPercent: 108, stagger: 0.04, duration: 0.9, ease: 'power3.out', clearProps: 'transform',
        scrollTrigger: { trigger: '.contact h2', start: 'top 92%', once: true },
        onStart: () => { contactHasRevealed = true; },
      });
    }
  });
}
configureMotion();
configureFabric();
reduceMotion.addEventListener('change', configureMotion);
reduceMotion.addEventListener('change', configureFabric);

document.querySelectorAll('.magnetic').forEach(button => {
  const children = button.querySelectorAll('span');
  button.addEventListener('pointermove', event => {
    if (reduceMotion.matches || !finePointer.matches || !motionAvailable) return;
    const bounds = button.getBoundingClientRect();
    const x = Math.max(-4, Math.min(4, (event.clientX - bounds.left - bounds.width / 2) * 0.05));
    const y = Math.max(-3, Math.min(3, (event.clientY - bounds.top - bounds.height / 2) * 0.12));
    gsap.to(children, { x, y, duration: 0.3, ease: 'power3.out', overwrite: true });
  });
  button.addEventListener('pointerleave', () => {
    if (!motionAvailable) return;
    if (reduceMotion.matches) { gsap.set(children, { clearProps: 'transform' }); return; }
    gsap.to(children, { x: 0, y: 0, duration: 0.35, ease: 'power3.out', overwrite: true });
  });
});

const mobileMenu = document.querySelector('.mobile-menu');
const allReading = [...document.querySelectorAll('main details:not(.gallery-disclosure)')];
const expandButton = document.querySelector('.expand-guide');
allReading.forEach((details, index) => { if (!details.id) details.id = `reading-${index + 1}`; });
expandButton.setAttribute('aria-controls', allReading.map(details => details.id).join(' '));
function syncReadingButton() {
  const allOpen = allReading.every(details => details.open);
  expandButton.textContent = allOpen ? 'Close all reading sections' : 'Open all reading sections';
  expandButton.setAttribute('aria-expanded', String(allOpen));
}
syncReadingButton();
expandButton.hidden = false;
expandButton.addEventListener('click', () => {
  const shouldOpen = !allReading.every(details => details.open);
  allReading.forEach(details => { details.open = shouldOpen; });
  syncReadingButton();
  refreshGeometry();
});

let refreshFrame;
function refreshGeometry() {
  cancelAnimationFrame(refreshFrame);
  refreshFrame = requestAnimationFrame(() => {
    lenis.resize();
    if (motionAvailable) ScrollTrigger.refresh();
  });
}
document.querySelectorAll('details').forEach(details => {
  details.addEventListener('toggle', () => { syncReadingButton(); refreshGeometry(); });
});

function revealTarget(target) {
  if (target.matches('details') && !target.matches('.gallery-disclosure')) target.open = true;
  for (let ancestor = target.parentElement; ancestor; ancestor = ancestor.parentElement) {
    if (ancestor.matches('details')) ancestor.open = true;
  }
}
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const hash = link.getAttribute('href');
    const target = document.getElementById(hash.slice(1));
    if (!target) return;
    event.preventDefault();
    mobileMenu.open = false;
    revealTarget(target);
    history.pushState(null, '', hash);
    lenis.resize();
    if (motionAvailable) ScrollTrigger.refresh();
    lenis.scrollTo(target, {
      offset: -85,
      immediate: reduceMotion.matches || !motionAvailable,
      onComplete: () => {
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      },
    });
  });
});
if (location.hash) {
  const target = document.getElementById(location.hash.slice(1));
  if (target) { revealTarget(target); refreshGeometry(); }
}
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && mobileMenu.open) {
    mobileMenu.open = false;
    mobileMenu.querySelector('summary').focus();
  }
});

const chapterLinks = [...document.querySelectorAll('.chapter-rail a')];
let chapterObserver;
if ('IntersectionObserver' in window) {
  chapterObserver = new IntersectionObserver(entries => {
    const visible = entries.find(entry => entry.isIntersecting);
    if (!visible) return;
    chapterLinks.forEach(link => {
      if (link.hash === '#' + visible.target.id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-12% 0px -65% 0px' });
  chapterLinks.forEach(link => chapterObserver.observe(document.querySelector(link.hash)));
}
document.fonts?.ready.then(refreshGeometry);
window.addEventListener('load', refreshGeometry, { once: true });
window.addEventListener('pagehide', event => {
  if (event.persisted) return;
  motionContext?.revert();
  fabricGeneration++;
  fabricScene?.dispose();
  if (motionAvailable) gsap.ticker.remove(tick);
  lenis.destroy();
  chapterObserver?.disconnect();
  reduceMotion.removeEventListener('change', configureMotion);
  reduceMotion.removeEventListener('change', configureFabric);
  cancelAnimationFrame(refreshFrame);
});
