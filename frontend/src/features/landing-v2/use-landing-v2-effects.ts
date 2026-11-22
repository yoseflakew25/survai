'use client';

import { useEffect, useRef, type Dispatch, type RefObject, type SetStateAction } from 'react';

import { createLandingTone } from '@/features/landing-v2/landing-v2-tone';

type Options = {
  menuOpen: boolean;
  setMenuOpen: Dispatch<SetStateAction<boolean>>;
};

function fmt(d: Date, utc: boolean, pad: boolean): string {
  let h = utc ? d.getUTCHours() : d.getHours();
  const m = utc ? d.getUTCMinutes() : d.getMinutes();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const hs = pad ? String(h).padStart(2, '0') : String(h);
  return `${hs}:${String(m).padStart(2, '0')} ${ap}`;
}

function rollDigits(el: Element) {
  el.querySelectorAll<HTMLElement>('.dg-col').forEach((c, i) => {
    c.style.transitionDelay = `${i * 0.1}s`;
    const t = c.dataset.t;
    if (t) c.style.transform = `translateY(-${t}em)`;
  });
}

function showReveal(el: Element) {
  el.classList.add('in');
  if (el.classList.contains('digits')) rollDigits(el);
}

export function useLandingV2Effects(rootRef: RefObject<HTMLDivElement | null>, opts: Options) {
  const toneRef = useRef<ReturnType<typeof createLandingTone> | null>(null);
  const slideIndexRef = useRef(0);
  const menuOpenRef = useRef(opts.menuOpen);
  menuOpenRef.current = opts.menuOpen;

  useEffect(() => {
    document.body.style.overflow = opts.menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [opts.menuOpen]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const q = <T extends Element>(s: string, c?: ParentNode) =>
      (c ?? root).querySelector<T>(s);
    const qa = <T extends Element>(s: string, c?: ParentNode) =>
      Array.from((c ?? root).querySelectorAll<T>(s));

  function tickClocks() {
      const d = new Date();
      qa<HTMLElement>('[data-clock="local"]').forEach((e) => {
        e.textContent = fmt(d, false, true);
      });
      qa<HTMLElement>('[data-clock="utc"]').forEach((e) => {
        e.textContent = fmt(d, true, true);
      });
      qa<HTMLElement>('[data-clock="local-s"]').forEach((e) => {
        e.textContent = fmt(d, false, false);
      });
      qa<HTMLElement>('[data-clock="utc-s"]').forEach((e) => {
        e.textContent = fmt(d, true, false);
      });
      qa<HTMLElement>('.aclock').forEach((c) => {
        const utc = c.hasAttribute('data-utc');
        const h = utc ? d.getUTCHours() : d.getHours();
        const m = utc ? d.getUTCMinutes() : d.getMinutes();
        const hourHand = c.querySelector<SVGLineElement>('.h');
        const minuteHand = c.querySelector<SVGLineElement>('.m');
        if (hourHand) {
          hourHand.style.transform = `rotate(${(h % 12) * 30 + m * 0.5}deg)`;
        }
        if (minuteHand) {
          minuteHand.style.transform = `rotate(${m * 6}deg)`;
        }
      });
    }

    tickClocks();
    const clockIv = setInterval(tickClocks, 15_000);

    const track = q<HTMLElement>('.clock-track');
    let clockAltIv: ReturnType<typeof setInterval> | undefined;
    if (track && !reduce) {
      clockAltIv = setInterval(() => track.classList.toggle('alt'), 3500);
    }

    qa<HTMLElement>('.digits').forEach((el) => {
      const v = el.getAttribute('data-value');
      if (!v) return;
      el.setAttribute('aria-label', v);
      el.textContent = '';
      v.split('').forEach((ch) => {
        const wrap = document.createElement('span');
        wrap.setAttribute('aria-hidden', 'true');
        if (/\d/.test(ch)) {
          wrap.className = 'dg';
          const col = document.createElement('span');
          col.className = 'dg-col';
          for (let i = 0; i < 20; i++) {
            const s = document.createElement('span');
            s.textContent = String(i % 10);
            col.appendChild(s);
          }
          col.dataset.t = String(10 + parseInt(ch, 10));
          wrap.appendChild(col);
        } else {
          wrap.textContent = ch;
        }
        el.appendChild(wrap);
      });
    });

    const revealEls = qa<HTMLElement>('.mask, .fade, .lines, .digits, .cta-words');
    let io: IntersectionObserver | undefined;
    if ('IntersectionObserver' in window && !reduce) {
      io = new IntersectionObserver(
        (es) => {
          es.forEach((e) => {
            if (e.isIntersecting) {
              showReveal(e.target);
              io?.unobserve(e.target);
            }
          });
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.01 }
      );
      revealEls.forEach((el) => io!.observe(el));
    } else {
      revealEls.forEach(showReveal);
    }

    const rays = q<SVGGElement>('.art-collect .rays');
    if (rays) {
      const ns = 'http://www.w3.org/2000/svg';
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * Math.PI * 2;
        const l = document.createElementNS(ns, 'line');
        const x1 = 90 + Math.cos(a) * 84;
        const y1 = 90 + Math.sin(a) * 84;
        const x2 = 90 + Math.cos(a) * 16;
        const y2 = 90 + Math.sin(a) * 16;
        l.setAttribute('x1', String(x1));
        l.setAttribute('y1', String(y1));
        l.setAttribute('x2', String(x2));
        l.setAttribute('y2', String(y2));
        l.style.animationDelay = `${-(i % 7) * 0.3}s`;
        rays.appendChild(l);
      }
    }

    const card = q<HTMLElement>('.team-card');
    const rows = qa<HTMLElement>('.trow');
    const setTeam = (row: HTMLElement, idx: number) => {
      rows.forEach((r) => r.classList.toggle('is-active', r === row));
      if (!card) return;
      const panel = q<HTMLElement>('.team-card-panel', card);
      const logo = q<HTMLElement>('.team-card-logo', card);
      const nameEl = q<HTMLElement>('.team-card-name', card);
      const countEl = q<HTMLElement>('.tc-i', card);
      panel?.style.setProperty('--tc', row.dataset.color ?? '');
      if (nameEl) {
        nameEl.textContent = row.querySelector('.trow-name')?.textContent ?? '';
      }
      if (countEl) countEl.textContent = String(idx + 1).padStart(2, '0');
      if (logo) {
        logo.classList.add('swap');
        setTimeout(() => {
          logo.innerHTML = '';
          logo.appendChild(document.createTextNode(row.dataset.a ?? ''));
          const b = document.createElement('b');
          b.textContent = row.dataset.b ?? '';
          logo.appendChild(b);
          logo.classList.remove('swap');
        }, 180);
      }
    };
    const teamCleanups: Array<() => void> = [];
    rows.forEach((r, i) => {
      r.tabIndex = 0;
      const onEnter = () => setTeam(r, i);
      r.addEventListener('mouseenter', onEnter);
      r.addEventListener('focus', onEnter);
      teamCleanups.push(() => {
        r.removeEventListener('mouseenter', onEnter);
        r.removeEventListener('focus', onEnter);
      });
    });

    const slides = qa<HTMLElement>('.pslide');
    const bar = q<HTMLElement>('.princ-bar i');
    const pimg = q<HTMLCanvasElement>('.princ-img canvas');
    const setSlide = (n: number) => {
      slideIndexRef.current = (n + slides.length) % slides.length;
      const pi = slideIndexRef.current;
      slides.forEach((s, i) => s.classList.toggle('is-active', i === pi));
      const s = slides[pi];
      if (bar) bar.style.transform = `translateX(${pi * 100}%)`; // width is 1/n via CSS
      const c = q<HTMLElement>('.pc-i');
      if (c) c.textContent = String(pi + 1).padStart(2, '0');
      const w = q<HTMLElement>('[data-pm="who"]');
      const st = q<HTMLElement>('[data-pm="stage"]');
      if (w && s) w.textContent = s.dataset.who ?? '';
      if (st && s) st.textContent = s.dataset.stage ?? '';
      if (pimg && s?.dataset.shape) {
        pimg.dataset.shape = s.dataset.shape;
        toneRef.current?.refresh(pimg);
      }
    };
    const pp = q<HTMLButtonElement>('.princ .prev');
    const pn = q<HTMLButtonElement>('.princ .next');
    const onPrev = () => setSlide(slideIndexRef.current - 1);
    const onNext = () => setSlide(slideIndexRef.current + 1);
    pp?.addEventListener('click', onPrev);
    pn?.addEventListener('click', onNext);

    const mt = q<HTMLElement>('.mods-track');
    const mp = q<HTMLButtonElement>('.mprev');
    const mn = q<HTMLButtonElement>('.mnext');
    const modState = () => {
      if (!mt) return;
      if (mp) mp.disabled = mt.scrollLeft < 4;
      if (mn) mn.disabled = mt.scrollLeft + mt.clientWidth > mt.scrollWidth - 4;
    };
    const step = () => {
      const m = mt?.querySelector('.mod');
      return m ? m.getBoundingClientRect().width : 360;
    };
    const onModPrev = () => mt?.scrollBy({ left: -step(), behavior: 'smooth' });
    const onModNext = () => mt?.scrollBy({ left: step(), behavior: 'smooth' });
    mp?.addEventListener('click', onModPrev);
    mn?.addEventListener('click', onModNext);
    mt?.addEventListener('scroll', modState, { passive: true });
    window.addEventListener('resize', modState);
    modState();

    const ctaLayout = () => {
      const first = q<HTMLElement>('.cw-row.r1 .cw');
      const r2 = q<HTMLElement>('.cw-row.r2');
      if (first && r2) r2.style.paddingLeft = `${first.getBoundingClientRect().width}px`;
    };
    window.addEventListener('resize', ctaLayout);
    if (document.fonts?.ready) void document.fonts.ready.then(ctaLayout);
    ctaLayout();

    const yr = q<HTMLElement>('.year');
    if (yr) yr.textContent = String(new Date().getFullYear());

    const tone = createLandingTone(root, reduce);
    toneRef.current = tone;
    const disposeTone = tone.init();

    requestAnimationFrame(() => {
      qa<HTMLElement>('.hero .mask').forEach((m) => m.classList.add('in'));
      qa<HTMLElement>('.hero .fade').forEach((m) => m.classList.add('in'));
    });
    if (document.fonts?.ready) void document.fonts.ready.then(() => tone.refreshAll());

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menuOpenRef.current) opts.setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);

    return () => {
      clearInterval(clockIv);
      if (clockAltIv) clearInterval(clockAltIv);
      io?.disconnect();
      teamCleanups.forEach((fn) => fn());
      pp?.removeEventListener('click', onPrev);
      pn?.removeEventListener('click', onNext);
      mp?.removeEventListener('click', onModPrev);
      mn?.removeEventListener('click', onModNext);
      mt?.removeEventListener('scroll', modState);
      window.removeEventListener('resize', modState);
      window.removeEventListener('resize', ctaLayout);
      document.removeEventListener('keydown', onKey);
      disposeTone();
      toneRef.current = null;
    };
    // Landing interactions initialize once; menu overflow is handled above.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-only setup
  }, []);
}