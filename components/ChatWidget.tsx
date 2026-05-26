'use client';
import { useState, useRef, useEffect } from 'react';

interface Message { role: 'user' | 'assistant'; content: string; }
type BookingStep = 'idle' | 'name' | 'phone' | 'service' | 'doctor' | 'time' | 'confirm' | 'done';
interface BookingData { name: string; phone: string; service: string; doctorId: string; doctorName: string; date: string; timeSlot: string; }
interface Doctor { id: string; name: string; specialization: string; }
interface SlotGroup { date: string; slots: string[]; }

const SERVICES = ['Лечение кариеса', 'Удаление зуба', 'Чистка зубов', 'Имплантация', 'Отбеливание', 'Консультация'];
const BOOKING_TRIGGERS = ['записаться', 'запись', 'прием', 'приём', 'записать', 'запишите', 'попасть', 'свободно', 'окно'];

function dateLabel(d: string) {
  const dt = new Date(d + 'T00:00:00');
  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `${days[dt.getDay()]}, ${dt.getDate()} ${months[dt.getMonth()]}`;
}

export default function ChatWidget({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Привет! Я ассистент клиники «Айкын Стом». Могу ответить на вопросы об услугах, ценах и записи на приём.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [bookingStep, setBookingStep] = useState<BookingStep>('idle');
  const [booking, setBooking] = useState<Partial<BookingData>>({});
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [slotGroups, setSlotGroups] = useState<SlotGroup[]>([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, bookingStep, open]);

  function addBot(content: string) {
    setMessages(prev => [...prev, { role: 'assistant', content }]);
  }
  function addUser(content: string) {
    setMessages(prev => [...prev, { role: 'user', content }]);
  }

  function startBooking() {
    setBookingStep('name');
    setTimeout(() => addBot('Отлично, запишем вас! Как вас зовут?'), 300);
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    if (bookingStep === 'name') { handleName(text); return; }
    if (bookingStep === 'phone') { handlePhone(text); return; }

    const isBooking = BOOKING_TRIGGERS.some(k => text.toLowerCase().includes(k));
    addUser(text);

    if (isBooking && bookingStep === 'idle') {
      startBooking();
      return;
    }

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setLoading(true);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.body) throw new Error('no body');

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      let accumulated = '';
      let gotBookingFlow = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const json = JSON.parse(line.slice(6));
            if (json.text) {
              accumulated += json.text;
              setLoading(false);
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: accumulated };
                return updated;
              });
            }
            if (json.done && json.booking_flow) gotBookingFlow = true;
          } catch { /* ignore */ }
        }
      }

      if (!accumulated) {
        setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: 'Не удалось получить ответ.' }; return u; });
      }
      if (gotBookingFlow && bookingStep === 'idle') startBooking();
    } catch {
      setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: 'Ошибка соединения. Позвоните нам напрямую.' }; return u; });
    } finally {
      setLoading(false);
    }
  }

  function handleName(name: string) {
    addUser(name);
    setBooking(b => ({ ...b, name }));
    setBookingStep('phone');
    setTimeout(() => addBot(`Приятно, ${name}! Укажите номер телефона для записи:`), 300);
  }

  function handlePhone(phone: string) {
    addUser(phone);
    setBooking(b => ({ ...b, phone }));
    setBookingStep('service');
    setTimeout(() => addBot('Какая услуга вас интересует?'), 300);
  }

  function selectService(service: string) {
    addUser(service);
    setBooking(b => ({ ...b, service }));
    setBookingStep('doctor');
    setBookingLoading(true);
    fetch('/api/doctors')
      .then(r => r.json())
      .then(data => {
        setDoctors(Array.isArray(data) ? data : []);
        setBookingLoading(false);
        addBot('Выберите врача:');
      })
      .catch(() => { setBookingLoading(false); addBot('Не удалось загрузить список врачей.'); });
  }

  async function selectDoctor(doc: Doctor) {
    addUser(doc.name);
    setBooking(b => ({ ...b, doctorId: doc.id, doctorName: doc.name }));
    setBookingStep('time');
    setBookingLoading(true);
    try {
      const res = await fetch(`/api/schedules?doctor_id=${doc.id}`);
      const data = await res.json();
      const groups: SlotGroup[] = Array.isArray(data) ? data : [];
      setSlotGroups(groups);
      setBookingLoading(false);
      if (!groups.length) {
        addBot(`У ${doc.name} пока нет свободных слотов. Позвоните нам — запишем вручную.`);
        setBookingStep('idle');
      } else {
        addBot(`Свободное время у врача ${doc.name}:`);
      }
    } catch {
      setBookingLoading(false);
      addBot('Ошибка загрузки расписания.');
    }
  }

  function selectSlot(date: string, timeSlot: string) {
    addUser(`${dateLabel(date)}, ${timeSlot}`);
    setBooking(b => ({ ...b, date, timeSlot }));
    setBookingStep('confirm');
    setTimeout(() => addBot('Проверьте данные и подтвердите запись:'), 300);
  }

  async function confirmBooking() {
    const b = booking as BookingData;
    setBookingLoading(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_name: b.name, user_phone: b.phone, service: b.service, doctor_id: b.doctorId, doctor_name: b.doctorName, date: b.date, time_slot: b.timeSlot }),
      });
      if (res.ok) {
        setBookingStep('done');
        addBot(`Вы записаны!\n\nИмя: ${b.name}\nТелефон: ${b.phone}\nУслуга: ${b.service}\nВрач: ${b.doctorName}\nДата: ${dateLabel(b.date)}\nВремя: ${b.timeSlot}\n\nМы позвоним для подтверждения.`);
      } else {
        const err = await res.json();
        addBot('Ошибка: ' + (err.error ?? 'попробуйте ещё раз'));
      }
    } catch {
      addBot('Ошибка соединения.');
    } finally {
      setBookingLoading(false);
      setDoctors([]); setSlotGroups([]);
    }
  }

  if (!open) return null;

  const showInput = bookingStep === 'idle' || bookingStep === 'name' || bookingStep === 'phone' || bookingStep === 'done';
  const placeholder = bookingStep === 'name' ? 'Введите ваше имя...' : bookingStep === 'phone' ? 'Введите номер телефона...' : 'Напишите вопрос...';

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[390px] max-w-[calc(100vw-24px)] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden" style={{ maxHeight: '88vh' }}>
      {/* Header */}
      <div className="bg-blue-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">AI</div>
          <div>
            <div className="text-white font-semibold text-sm">Ассистент Айкын Стом</div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
              <span className="text-blue-100 text-xs">Онлайн</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="text-blue-200 hover:text-white transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'}`}>
              {m.content}
            </div>
          </div>
        ))}

        {(loading || bookingLoading) && (
          <div className="flex justify-start">
            <div className="bg-white px-4 py-3 rounded-2xl shadow-sm">
              <div className="flex gap-1">{[0,1,2].map(i => <span key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}</div>
            </div>
          </div>
        )}

        {/* Выбор услуги */}
        {bookingStep === 'service' && !bookingLoading && (
          <div className="flex flex-wrap gap-2">
            {SERVICES.map(s => (
              <button key={s} onClick={() => selectService(s)} className="text-sm bg-white border border-blue-200 text-blue-600 px-3 py-2 rounded-xl hover:bg-blue-50 transition-colors shadow-sm">
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Выбор врача */}
        {bookingStep === 'doctor' && !bookingLoading && doctors.length > 0 && (
          <div className="space-y-2">
            {doctors.map(d => (
              <button key={d.id} onClick={() => selectDoctor(d)} className="w-full text-left bg-white border border-gray-200 rounded-xl p-3 hover:border-blue-400 hover:bg-blue-50 transition-colors shadow-sm">
                <p className="font-semibold text-gray-900 text-sm">{d.name}</p>
                <p className="text-xs text-gray-500">{d.specialization}</p>
              </button>
            ))}
          </div>
        )}

        {/* Выбор времени */}
        {bookingStep === 'time' && !bookingLoading && slotGroups.length > 0 && (
          <div className="space-y-3">
            {slotGroups.map(g => (
              <div key={g.date} className="bg-white rounded-xl p-3 shadow-sm border">
                <p className="text-xs font-semibold text-gray-500 mb-2">{dateLabel(g.date)}</p>
                <div className="flex flex-wrap gap-2">
                  {g.slots.map(slot => (
                    <button key={slot} onClick={() => selectSlot(g.date, slot)} className="text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-600 hover:text-white transition-colors border border-blue-100">
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Подтверждение */}
        {bookingStep === 'confirm' && !bookingLoading && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100">
            <div className="space-y-1.5 text-sm text-gray-700 mb-4">
              <p><span className="text-gray-400">Имя: </span>{booking.name}</p>
              <p><span className="text-gray-400">Телефон: </span>{booking.phone}</p>
              <p><span className="text-gray-400">Услуга: </span>{booking.service}</p>
              <p><span className="text-gray-400">Врач: </span>{booking.doctorName}</p>
              <p><span className="text-gray-400">Дата: </span>{booking.date ? dateLabel(booking.date) : ''}</p>
              <p><span className="text-gray-400">Время: </span>{booking.timeSlot}</p>
            </div>
            <button onClick={confirmBooking} disabled={bookingLoading} className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
              Подтвердить запись
            </button>
          </div>
        )}

        {/* Быстрые кнопки (начало) */}
        {messages.length === 1 && bookingStep === 'idle' && (
          <div className="flex flex-wrap gap-2">
            {['Записаться на приём', 'Какие цены?', 'Режим работы'].map(q => (
              <button key={q} onClick={() => { setInput(q); }} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors border border-blue-100">
                {q}
              </button>
            ))}
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      {showInput && (
        <div className="p-3 border-t border-gray-100 flex gap-2 flex-shrink-0">
          <input
            type={bookingStep === 'phone' ? 'tel' : 'text'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder={placeholder}
            autoFocus
            className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-blue-400 transition-colors"
          />
          <button onClick={send} disabled={loading || !input.trim()} className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 transition-colors shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}
