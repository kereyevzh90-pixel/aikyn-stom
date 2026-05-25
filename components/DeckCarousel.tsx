'use client';

import { useEffect, useRef } from 'react';

const SERVICES = [
  {
    title: 'Имплантация зубов',
    sub: 'Хирургия',
    price: 'от 150 000 ₸',
    gradient: 'radial-gradient(ellipse at 55% 40%, #d8d8d8 0%, #b0b2b8 60%, #9a9ca4 100%)',
    svg: `<svg viewBox="0 0 200 220" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="c1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f0f0f0"/><stop offset="100%" stop-color="#b0b0b0"/></linearGradient>
        <linearGradient id="c2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#c8a96e"/><stop offset="100%" stop-color="#8a6a30"/></linearGradient>
        <filter id="sh"><feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="rgba(0,0,0,0.35)"/></filter>
      </defs>
      <g filter="url(#sh)">
        <path d="M72 58 Q100 28 128 58 Q124 80 116 86 Q100 92 84 86 Q76 80 72 58Z" fill="url(#c1)" stroke="#c8c8c8" stroke-width="1"/>
        <rect x="91" y="86" width="18" height="10" rx="3" fill="#d4a84e"/>
        <g fill="none" stroke="url(#c2)" stroke-width="3">
          <line x1="91" y1="96" x2="109" y2="96"/><line x1="91" y1="102" x2="109" y2="102"/>
          <line x1="91" y1="108" x2="109" y2="108"/><line x1="91" y1="114" x2="109" y2="114"/>
          <line x1="91" y1="120" x2="109" y2="120"/><line x1="91" y1="126" x2="109" y2="126"/>
          <line x1="91" y1="132" x2="109" y2="132"/><line x1="91" y1="138" x2="109" y2="138"/>
          <line x1="91" y1="144" x2="109" y2="144"/><line x1="91" y1="150" x2="109" y2="150"/>
        </g>
        <path d="M94 162 Q100 172 106 162 L108 170 Q100 185 92 170Z" fill="url(#c2)"/>
      </g>
    </svg>`,
  },
  {
    title: 'Отбеливание ZOOM',
    sub: 'Эстетика',
    price: 'от 60 000 ₸',
    gradient: 'radial-gradient(ellipse at 50% 45%, #eef2f8 0%, #d8dff0 60%, #c4cce4 100%)',
    svg: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#f0f0f0"/></linearGradient>
        <filter id="sh2"><feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="rgba(50,80,180,0.15)"/></filter>
      </defs>
      <g filter="url(#sh2)">
        <path d="M28 95 Q100 55 172 95 Q148 150 100 162 Q52 150 28 95Z" fill="url(#tg)" stroke="#e0e4f0" stroke-width="1.5"/>
        <rect x="42" y="97" width="22" height="28" rx="5" fill="white" stroke="#dde2f0" stroke-width="1.2"/>
        <rect x="67" y="93" width="22" height="32" rx="5" fill="white" stroke="#dde2f0" stroke-width="1.2"/>
        <rect x="92" y="91" width="18" height="34" rx="5" fill="white" stroke="#dde2f0" stroke-width="1.2"/>
        <rect x="113" y="93" width="22" height="32" rx="5" fill="white" stroke="#dde2f0" stroke-width="1.2"/>
        <rect x="138" y="97" width="22" height="28" rx="5" fill="white" stroke="#dde2f0" stroke-width="1.2"/>
        <path d="M96 40 L98.5 48 L107 48 L100.5 52.5 L103 60 L96 56 L89 60 L91.5 52.5 L85 48 L93.5 48Z" fill="#4F6EF7" opacity="0.8"/>
      </g>
    </svg>`,
  },
  {
    title: 'Брекеты и элайнеры',
    sub: 'Ортодонтия',
    price: 'от 180 000 ₸',
    gradient: 'radial-gradient(ellipse at 50% 45%, #dde8f0 0%, #b8ccd8 60%, #a0b8c8 100%)',
    svg: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="sh3"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="rgba(0,40,80,0.18)"/></filter>
        <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f8faff"/><stop offset="100%" stop-color="#e8eef8"/></linearGradient>
      </defs>
      <g filter="url(#sh3)">
        <path d="M30 100 Q60 70 100 65 Q140 70 170 100 Q148 145 100 155 Q52 145 30 100Z" fill="url(#ag)" stroke="#d0d8e8" stroke-width="1.5"/>
        <rect x="44" y="100" width="18" height="22" rx="4" fill="white" stroke="#c0cce0" stroke-width="1"/>
        <rect x="65" y="96" width="18" height="26" rx="4" fill="white" stroke="#c0cce0" stroke-width="1"/>
        <rect x="86" y="93" width="18" height="30" rx="4" fill="white" stroke="#c0cce0" stroke-width="1"/>
        <rect x="107" y="96" width="18" height="26" rx="4" fill="white" stroke="#c0cce0" stroke-width="1"/>
        <rect x="128" y="100" width="18" height="22" rx="4" fill="white" stroke="#c0cce0" stroke-width="1"/>
        <rect x="48" y="107" width="10" height="8" rx="2" fill="#4F6EF7" opacity="0.7"/>
        <rect x="69" y="105" width="10" height="8" rx="2" fill="#4F6EF7" opacity="0.7"/>
        <rect x="90" y="103" width="10" height="8" rx="2" fill="#4F6EF7" opacity="0.7"/>
        <rect x="111" y="105" width="10" height="8" rx="2" fill="#4F6EF7" opacity="0.7"/>
        <rect x="132" y="107" width="10" height="8" rx="2" fill="#4F6EF7" opacity="0.7"/>
        <path d="M53 111 L74 109 L95 107 L116 109 L137 111" stroke="#4F6EF7" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.8"/>
      </g>
    </svg>`,
  },
  {
    title: 'Коронки и виниры',
    sub: 'Протезирование',
    price: 'от 50 000 ₸',
    gradient: 'radial-gradient(ellipse at 50% 45%, #f0ece0 0%, #ddd0b0 60%, #c8b888 100%)',
    svg: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="0.7" y2="1"><stop offset="0%" stop-color="#f8f4ec"/><stop offset="100%" stop-color="#d4c090"/></linearGradient>
        <filter id="sh4"><feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="rgba(80,50,0,0.2)"/></filter>
      </defs>
      <g filter="url(#sh4)">
        <path d="M68 110 L62 72 L78 84 L100 60 L122 84 L138 72 L132 110 Z" fill="url(#cg)" stroke="#c4a860" stroke-width="1.5"/>
        <path d="M78 87 Q100 78 122 87 L118 95 Q100 90 82 95Z" fill="rgba(255,255,255,0.35)"/>
      </g>
    </svg>`,
  },
  {
    title: 'Детская стоматология',
    sub: 'Педиатрия',
    price: 'Консультация бесплатно',
    gradient: 'radial-gradient(ellipse at 50% 45%, #e8f0e8 0%, #c4d8c4 60%, #a8c4a8 100%)',
    svg: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="sh5"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="rgba(0,60,0,0.15)"/></filter>
      </defs>
      <g filter="url(#sh5)">
        <circle cx="100" cy="95" r="52" fill="white" opacity="0.9" stroke="#c0d8b8" stroke-width="1.5"/>
        <circle cx="82" cy="84" r="7" fill="#3a3a4a"/>
        <circle cx="118" cy="84" r="7" fill="#3a3a4a"/>
        <circle cx="84" cy="82" r="2.5" fill="white"/>
        <circle cx="120" cy="82" r="2.5" fill="white"/>
        <path d="M76 108 Q100 124 124 108" stroke="#3a3a4a" stroke-width="3" stroke-linecap="round" fill="none"/>
        <circle cx="78" cy="108" r="3" fill="#e88"/>
        <circle cx="122" cy="108" r="3" fill="#e88"/>
        <circle cx="72" cy="92" r="10" fill="rgba(232,136,136,0.25)"/>
        <circle cx="128" cy="92" r="10" fill="rgba(232,136,136,0.25)"/>
      </g>
    </svg>`,
  },
];

const VISIBLE = 4;
const ROT_STEP = 5;
const TX_STEP = 22;
const TY_STEP = 9;

export default function DeckCarousel({ onBooking }: { onBooking: () => void }) {
  const deckRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const onBookingRef = useRef(onBooking);
  onBookingRef.current = onBooking;

  useEffect(() => {
    const deckEl = deckRef.current!;
    const dotsEl = dotsRef.current!;

    let current = 0;
    let dragging = false;
    let startX = 0;
    let dragX = 0;
    let velocity = 0;
    let lastX = 0;
    let lastT = 0;
    let animating = false;
    let cardEls: HTMLDivElement[] = [];

    function cardHTML(s: (typeof SERVICES)[0]) {
      return `
        <div class="dk-img" style="background:${s.gradient}">
          <div class="dk-svg">${s.svg}</div>
        </div>
        <div class="dk-body">
          <div class="dk-meta">${s.sub}</div>
          <h3 class="dk-title">${s.title}</h3>
          <div class="dk-footer">
            <a href="#" class="dk-learn" data-booking="true">
              Подробнее
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </a>
            <span class="dk-price">${s.price}</span>
            <span class="dk-more">Записаться <span class="dk-dot"></span></span>
          </div>
        </div>`;
    }

    function buildDeck() {
      deckEl.innerHTML = '';
      cardEls = [];
      for (let i = VISIBLE - 1; i >= 0; i--) {
        const idx = (current + i) % SERVICES.length;
        const el = document.createElement('div');
        el.className = 'dk-card';
        el.innerHTML = cardHTML(SERVICES[idx]);
        deckEl.appendChild(el);
        cardEls.unshift(el);
      }
      applyPositions(0, false);
      buildDots();
      bindFrontCard();
    }

    function applyPositions(drag: number, animated: boolean) {
      cardEls.forEach((card, i) => {
        let tx: number, ty: number, rot: number, scale: number, zIdx: number, opacity: number;
        if (i === 0) {
          const lift = Math.min(Math.abs(drag) * 0.08, 16);
          tx = drag; ty = -lift; rot = drag / 14; scale = 1; zIdx = 10; opacity = 1;
        } else {
          const pull = Math.min(Math.abs(drag) / 160, 1);
          tx = TX_STEP * i * (1 - pull * 0.18);
          ty = TY_STEP * i * (1 - pull * 0.12);
          rot = ROT_STEP * i * (1 - pull * 0.22);
          scale = 1 - i * 0.02; zIdx = 10 - i; opacity = i < VISIBLE ? 1 : 0;
        }
        const ease = animated ? 'transform 0.5s cubic-bezier(0.23,1,0.32,1), opacity 0.4s ease' : 'none';
        card.style.cssText = `
          transform: translate(${tx}px,${ty}px) rotate(${rot}deg) scale(${scale});
          z-index:${zIdx}; opacity:${opacity}; transition:${ease};
          box-shadow:${i === 0 ? '0 24px 64px rgba(0,0,0,0.14),0 4px 16px rgba(0,0,0,0.08)' : `0 ${6 + i * 2}px ${20 + i * 6}px rgba(0,0,0,${0.07 - i * 0.01})`};
        `;
      });
    }

    function buildDots() {
      dotsEl.innerHTML = '';
      SERVICES.forEach((_, i) => {
        const d = document.createElement('span');
        d.className = 'dk-dot-nav' + (i === current ? ' active' : '');
        d.onclick = () => { if (!animating && i !== current) { current = i; buildDeck(); } };
        dotsEl.appendChild(d);
      });
    }

    function dismiss(dir: number) {
      if (animating) return;
      animating = true;
      const front = cardEls[0];
      const exitX = dir * (window.innerWidth * 0.75);
      front.style.transition = 'transform 0.42s cubic-bezier(0.55,0,1,0.45), opacity 0.38s ease';
      front.style.transform = `translate(${exitX}px,-20px) rotate(${dir * 28}deg) scale(0.88)`;
      front.style.opacity = '0';
      setTimeout(() => {
        cardEls.slice(1).forEach((card, i) => {
          card.style.transition = `transform 0.45s cubic-bezier(0.23,1,0.32,1) ${i * 40}ms`;
          card.style.transform = `translate(${TX_STEP * i}px,${TY_STEP * i}px) rotate(${ROT_STEP * i}deg) scale(${1 - i * 0.02})`;
        });
      }, 60);
      setTimeout(() => {
        current = dir < 0 ? (current + 1) % SERVICES.length : (current - 1 + SERVICES.length) % SERVICES.length;
        animating = false;
        buildDeck();
      }, 460);
    }

    function bindFrontCard() {
      const front = cardEls[0];
      if (!front) return;
      front.addEventListener('mousedown', e => {
        if (animating) return;
        dragging = true; startX = e.clientX; dragX = 0; velocity = 0; lastX = e.clientX; lastT = Date.now();
        deckEl.style.cursor = 'grabbing'; e.preventDefault();
      });
      front.addEventListener('touchstart', e => {
        if (animating) return;
        dragging = true; startX = e.touches[0].clientX; dragX = 0; velocity = 0; lastX = e.touches[0].clientX; lastT = Date.now();
      }, { passive: true });
      front.addEventListener('click', e => {
        if ((e.target as HTMLElement).closest('[data-booking]')) { e.preventDefault(); onBookingRef.current(); }
      });
    }

    function onMouseMove(e: MouseEvent) {
      if (!dragging) return;
      const now = Date.now(), dt = now - lastT;
      if (dt > 0) velocity = (e.clientX - lastX) / dt * 14;
      lastX = e.clientX; lastT = now; dragX = e.clientX - startX;
      applyPositions(dragX, false);
    }

    function onTouchMove(e: TouchEvent) {
      if (!dragging) return;
      const now = Date.now(), dt = now - lastT, cx = e.touches[0].clientX;
      if (dt > 0) velocity = (cx - lastX) / dt * 14;
      lastX = cx; lastT = now; dragX = cx - startX;
      applyPositions(dragX, false);
    }

    function endDrag() {
      if (!dragging) return;
      dragging = false; deckEl.style.cursor = '';
      const projected = dragX + velocity * 5;
      if (projected < -90 || velocity < -2.5) dismiss(-1);
      else if (projected > 90 || velocity > 2.5) dismiss(1);
      else { dragX = 0; applyPositions(0, true); }
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
    document.addEventListener('mouseleave', endDrag);

    const prevBtn = prevRef.current;
    const nextBtn = nextRef.current;
    const onPrev = () => dismiss(1);
    const onNext = () => dismiss(-1);
    prevBtn?.addEventListener('click', onPrev);
    nextBtn?.addEventListener('click', onNext);

    buildDeck();

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('mouseup', endDrag);
      document.removeEventListener('touchend', endDrag);
      document.removeEventListener('mouseleave', endDrag);
      prevBtn?.removeEventListener('click', onPrev);
      nextBtn?.removeEventListener('click', onNext);
    };
  }, []);

  return (
    <div className="deck-area">
      <div className="deck-hint">← перетащите карточку →</div>
      <div className="deck-scene">
        <div className="deck" ref={deckRef} role="region" aria-label="Карусель услуг" />
      </div>
      <div className="deck-controls">
        <button className="deck-btn" ref={prevRef} aria-label="Назад">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="deck-dots" ref={dotsRef} />
        <button className="deck-btn" ref={nextRef} aria-label="Вперёд">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
