'use client';

import { useState, useEffect } from 'react';
import DeckCarousel from '@/components/DeckCarousel';
import ChatWidget from '@/components/ChatWidget';

export default function Home() {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [timer, setTimer] = useState('');

  useEffect(() => {
    function update() {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      let diff = Math.floor((midnight.getTime() - now.getTime()) / 1000);
      const h = Math.floor(diff / 3600); diff -= h * 3600;
      const m = Math.floor(diff / 60);
      const s = diff - m * 60;
      setTimer(`${h}ч ${String(m).padStart(2, '0')}м ${String(s).padStart(2, '0')}с`);
    }
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <>
      {/* NAVBAR */}
      <header className="navbar">
        <div className="navbar__inner">
          <div className="logo">
            <span className="logo__light">Айкын</span><span className="logo__bold">Стом</span>
          </div>
          <nav className="nav">
            <a href="#">Услуги</a>
            <a href="#">О нас</a>
            <a href="#">Цены</a>
          </nav>
          <button
            onClick={() => setChatOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 22px', background: 'var(--blue)', color: 'white', fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', borderRadius: 100, border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--blue-dark)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--blue)')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            СПРОСИТЬ ИИ
          </button>
        </div>
      </header>

      {/* HERO */}
      <div className="hero-area">
        <div className="intro-text">
          <span className="intro-badge">Стоматология в Алматы</span>
          <h1 className="intro-title">Ваша улыбка в<br /><em>надёжных руках</em></h1>
        </div>

        <div className="hero-card">
          <div className="hero-card__overlay" />
          <div className="hero-card__contact">
            <p className="hero-card__phone">+7 727 123-45-67</p>
            <p className="hero-card__address">ул. Абая, 15,<br />Алматы, Казахстан</p>
          </div>
          <div className="hero-card__headline">
            <h2>Smile<br />Confidently</h2>
          </div>
          <div className="booking-widget">
            <div className="booking-widget__info">
              <div className="booking-widget__title">
                Book in <span className="booking-widget__timer">{timer}</span>
              </div>
              <div className="booking-widget__sub">Запишитесь онлайн прямо сейчас</div>
              <div className="booking-widget__sub2">Консультация — бесплатно</div>
            </div>
            <button className="booking-widget__btn" onClick={() => setBookingOpen(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* SERVICES */}
      <section className="services">
        <div className="services__top">
          <div className="services__left">
            <span className="services__badge">Услуги</span>
            <h2 className="services__title">
              Полный спектр<br />
              <em>стоматологических услуг</em>
            </h2>
          </div>
          <p className="services__desc">
            Предлагаем все виды стоматологической помощи под одной крышей — эстетические трансформации,
            точное протезирование, ортодонтия и специализированная помощь для взрослых и детей.
          </p>
        </div>

        <DeckCarousel onBooking={() => setBookingOpen(true)} />

        <div className="services-tags">
          <span>Протезирование<sup>™</sup></span>
          <span>Эстетика<sup>™</sup></span>
          <span className="tag--active">Имплантация<sup>™</sup></span>
          <span>Ортодонтия<sup>™</sup></span>
          <span>Хирургия<sup>™</sup></span>
          <span>Лечение<sup>™</sup></span>
          <span>Детская стоматология<sup>™</sup></span>
        </div>
      </section>

      {/* BOOKING MODAL */}
      {bookingOpen && (
        <div
          className="modal-overlay modal-overlay--open"
          onClick={e => { if (e.target === e.currentTarget) setBookingOpen(false); }}
        >
          <div className="modal">
            <button className="modal-close" onClick={() => setBookingOpen(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
              <div style={{ fontSize: 48 }}>📞</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>Запись на приём</div>
              <div style={{ fontSize: 16, color: '#6B7280' }}>Позвоните нам:</div>
              <a href="tel:+77271234567" style={{ fontSize: 28, fontWeight: 800, color: '#4F6EF7', textDecoration: 'none' }}>
                +7 727 123-45-67
              </a>
              <div style={{ fontSize: 13, color: '#9CA3AF' }}>Пн–Сб 09:00–19:00</div>
            </div>
          </div>
        </div>
      )}

      {/* CHAT */}
      <ChatWidget open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
