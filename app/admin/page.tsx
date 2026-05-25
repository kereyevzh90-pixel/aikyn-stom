'use client';
import { useState, useEffect, useCallback } from 'react';
import type { ClinicConfig, FaqItem } from '@/types/config';

const TABS = ['FAQ ответы', 'Системный промпт', 'Настройки', 'Записи', 'Врачи', 'Чаты'] as const;
type Tab = typeof TABS[number];

const EMPTY_CONFIG: ClinicConfig = { clinicName: '', city: '', address: '', phone: '', schedule: '', systemPrompt: '', faq: [] };

type Appointment = { id: string; created_at: string; user_name: string; user_phone: string; service: string; doctor_name: string; date: string; time_slot: string; status: string };
type Doctor = { id: string; name: string; specialization: string; photo_url: string; working_days: string[]; work_start: string; work_end: string; break_start: string; break_end: string };
type SlotInfo = { id: string; time_slot: string; is_blocked: boolean; is_booked: boolean };

const STATUS_LABEL: Record<string, string> = { new: 'Новая', confirmed: 'Подтверждено', arrived: 'Пришёл', cancelled: 'Отменено' };
const STATUS_COLOR: Record<string, string> = { new: 'bg-yellow-100 text-yellow-800', confirmed: 'bg-green-100 text-green-800', arrived: 'bg-blue-100 text-blue-700', cancelled: 'bg-red-100 text-red-700' };
const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function fmtDay(d: string) {
  const dt = new Date(d + 'T00:00:00');
  const days = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
  const months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
  return `${days[dt.getDay()]} ${dt.getDate()} ${months[dt.getMonth()]}`;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pwdInput, setPwdInput] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [savedPwd, setSavedPwd] = useState('');
  const [tab, setTab] = useState<Tab>('FAQ ответы');
  const [config, setConfig] = useState<ClinicConfig>(EMPTY_CONFIG);
  const [status, setStatus] = useState('');
  const [statusOk, setStatusOk] = useState(true);
  const [saving, setSaving] = useState(false);

  // Appointments
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [apptSearch, setApptSearch] = useState('');
  const [apptStatus, setApptStatus] = useState('');
  const [apptDoctor, setApptDoctor] = useState('');
  const [apptDate, setApptDate] = useState('');
  const [apptLoading, setApptLoading] = useState(false);

  // Doctors
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Partial<Doctor> | null>(null);
  const [addingDoctor, setAddingDoctor] = useState(false);

  // Chats
  type ChatMsg = { role: string; content: string };
  type Chat = { id: string; created_at: string; messages: ChatMsg[] };
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);

  // Client chat panel (from Записи tab)
  const [clientChatPanel, setClientChatPanel] = useState<{ name: string; phone: string; chats: Chat[] } | null>(null);
  const [clientChatLoading, setClientChatLoading] = useState(false);

  async function openClientChat(name: string, phone: string) {
    setClientChatLoading(true);
    setClientChatPanel({ name, phone, chats: [] });
    try {
      const res = await fetch(`/api/chats?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      setClientChatPanel({ name, phone, chats: Array.isArray(data) ? data : [] });
    } finally { setClientChatLoading(false); }
  }

  const loadChats = useCallback(async () => {
    setChatsLoading(true);
    try { const res = await fetch('/api/chats'); setChats(await res.json()); }
    finally { setChatsLoading(false); }
  }, []);

  useEffect(() => { if (tab === 'Чаты') loadChats(); }, [tab, loadChats]);

  // Schedule
  const [scheduleDoctor, setScheduleDoctor] = useState<Doctor | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleSlots, setScheduleSlots] = useState<Record<string, SlotInfo[]>>({});
  const [scheduleLoading, setScheduleLoading] = useState(false);

  useEffect(() => { setSavedPwd(localStorage.getItem('adminPassword') ?? 'admin123'); }, []);

  function showStatus(msg: string, ok: boolean) {
    setStatus(msg); setStatusOk(ok);
    setTimeout(() => setStatus(''), 3000);
  }

  async function login() {
    if (pwdInput === savedPwd) { setAuthed(true); loadConfig(); }
    else { setPwdError('Неверный пароль'); setPwdInput(''); }
  }

  async function loadConfig() {
    try { const res = await fetch('/api/config'); setConfig(await res.json()); }
    catch { showStatus('Не удалось загрузить конфиг', false); }
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-password': savedPwd }, body: JSON.stringify(config) });
      if (res.ok) showStatus('Сохранено ✓', true);
      else showStatus('Ошибка: ' + res.status, false);
    } catch { showStatus('Ошибка сети', false); }
    finally { setSaving(false); }
  }

  function addFaq() { setConfig(c => ({ ...c, faq: [...c.faq, { id: String(Date.now()), q: '', a: '' }] })); }
  function updateFaq(id: string, field: 'q' | 'a', val: string) { setConfig(c => ({ ...c, faq: c.faq.map(f => f.id === id ? { ...f, [field]: val } : f) })); }
  function deleteFaq(id: string) { setConfig(c => ({ ...c, faq: c.faq.filter(f => f.id !== id) })); }

  // ── APPOINTMENTS ──
  const loadAppointments = useCallback(async () => {
    setApptLoading(true);
    const params = new URLSearchParams();
    if (apptSearch) params.set('search', apptSearch);
    if (apptStatus) params.set('status', apptStatus);
    if (apptDoctor) params.set('doctor', apptDoctor);
    if (apptDate) params.set('date', apptDate);
    try {
      const res = await fetch('/api/appointments?' + params.toString());
      setAppointments(await res.json());
    } finally { setApptLoading(false); }
  }, [apptSearch, apptStatus, apptDoctor, apptDate]);

  useEffect(() => { if (tab === 'Записи') loadAppointments(); }, [tab, loadAppointments]);

  async function updateApptStatus(id: string, newStatus: string) {
    await fetch('/api/appointments', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: newStatus }) });
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
  }

  // ── DOCTORS ──
  const loadDoctors = useCallback(async () => {
    setDoctorLoading(true);
    try { const res = await fetch('/api/doctors'); setDoctors(await res.json()); }
    finally { setDoctorLoading(false); }
  }, []);

  useEffect(() => { if (tab === 'Врачи') loadDoctors(); }, [tab, loadDoctors]);

  async function saveDoctor() {
    if (!editingDoctor?.name || !editingDoctor?.specialization) { showStatus('Заполните имя и специализацию', false); return; }
    try {
      let res;
      if (editingDoctor.id) {
        res = await fetch('/api/doctors', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editingDoctor) });
      } else {
        res = await fetch('/api/doctors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...editingDoctor, working_days: editingDoctor.working_days ?? [] }) });
      }
      const data = await res.json();
      if (!res.ok) { showStatus('Ошибка: ' + (data.error ?? res.status), false); return; }
      setEditingDoctor(null); setAddingDoctor(false);
      loadDoctors(); showStatus('Сохранено ✓', true);
    } catch (e) {
      showStatus('Ошибка соединения: ' + String(e), false);
    }
  }

  async function deleteDoctor(id: string) {
    if (!confirm('Удалить врача?')) return;
    await fetch('/api/doctors', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    loadDoctors();
  }

  // ── SCHEDULE ──
  async function loadSchedule(doctorId: string, date?: string) {
    setScheduleLoading(true);
    const params = new URLSearchParams({ doctor_id: doctorId, admin: 'true' });
    if (date) params.set('date', date);
    try {
      const res = await fetch('/api/schedules?' + params.toString());
      setScheduleSlots(await res.json());
    } finally { setScheduleLoading(false); }
  }

  async function generateSlots() {
    if (!scheduleDoctor || !scheduleDate) return;
    await fetch('/api/schedules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ doctor_id: scheduleDoctor.id, date: scheduleDate, generate: true }) });
    loadSchedule(scheduleDoctor.id, scheduleDate);
  }

  async function toggleBlock(slotId: string, is_blocked: boolean) {
    await fetch('/api/schedules', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: slotId, is_blocked: !is_blocked }) });
    if (scheduleDoctor) loadSchedule(scheduleDoctor.id, scheduleDate || undefined);
  }

  async function deleteSlot(slotId: string) {
    await fetch('/api/schedules', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: slotId }) });
    if (scheduleDoctor) loadSchedule(scheduleDoctor.id, scheduleDate || undefined);
  }

  const uniqueDoctors = Array.from(new Set(appointments.map(a => a.doctor_name)));

  // ── LOGIN ──
  if (!authed) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 w-full max-w-sm text-center">
        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Админ-панель</h1>
        <p className="text-sm text-gray-500 mb-7">Управление ассистентом Айкын Стом</p>
        <input type="password" value={pwdInput} onChange={e => { setPwdInput(e.target.value); setPwdError(''); }} onKeyDown={e => e.key === 'Enter' && login()} placeholder="Пароль" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 mb-2 transition-colors" />
        {pwdError && <p className="text-red-500 text-xs mb-2">{pwdError}</p>}
        <button onClick={login} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors">Войти</button>
        <p className="text-xs text-gray-400 mt-4">По умолчанию: admin123</p>
      </div>
    </div>
  );

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2"><path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2z" opacity="0.5"/><path d="M8 12s1.5 2 4 2 4-2 4-2"/></svg>
            </div>
            <span className="font-semibold text-gray-900">Дента Админ</span>
          </div>
          <div className="flex items-center gap-3">
            {status && <span className={`text-xs font-medium ${statusOk ? 'text-green-600' : 'text-red-500'}`}>{status}</span>}
            {(tab === 'FAQ ответы' || tab === 'Системный промпт' || tab === 'Настройки') && (
              <button onClick={save} disabled={saving} className="bg-blue-600 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            )}
            <button onClick={() => setAuthed(false)} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">Выйти</button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-8 flex-wrap">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* ── FAQ ── */}
        {tab === 'FAQ ответы' && (
          <div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
              <h2 className="font-bold text-gray-900 mb-1">FAQ — точные ответы</h2>
              <p className="text-sm text-gray-500 mb-6">Ассистент сначала ищет совпадение в FAQ. Если находит — использует этот ответ как основу.</p>
              <div className="space-y-4">
                {config.faq.length === 0 && <p className="text-center text-gray-400 text-sm py-8">Нет FAQ. Добавьте первый вопрос.</p>}
                {config.faq.map((item: FaqItem) => (
                  <div key={item.id} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-start bg-gray-50 rounded-xl p-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Вопрос / ключевые слова</label>
                      <input value={item.q} onChange={e => updateFaq(item.id, 'q', e.target.value)} placeholder="цена, кариес, запись..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white transition-colors" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Ответ ассистента</label>
                      <textarea value={item.a} onChange={e => updateFaq(item.id, 'a', e.target.value)} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white resize-none transition-colors" />
                    </div>
                    <button onClick={() => deleteFaq(item.id)} className="mt-5 w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:border-red-300 hover:bg-red-50 transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={addFaq} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors">+ Добавить вопрос-ответ</button>
          </div>
        )}

        {/* ── SYSTEM PROMPT ── */}
        {tab === 'Системный промпт' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-1">Системный промпт</h2>
            <p className="text-sm text-gray-500 mb-5">Главная инструкция для ИИ: кто он, как говорит, что знает.</p>
            <textarea value={config.systemPrompt} onChange={e => setConfig(c => ({ ...c, systemPrompt: e.target.value }))} rows={14} placeholder="Ты — ассистент клиники Айкын Стом..." className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono outline-none focus:border-blue-400 resize-none transition-colors leading-relaxed" />
          </div>
        )}

        {/* ── SETTINGS ── */}
        {tab === 'Настройки' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-5">Данные клиники</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {([{ key: 'clinicName', label: 'Название', placeholder: 'Айкын Стом' }, { key: 'city', label: 'Город', placeholder: 'Алматы' }, { key: 'address', label: 'Адрес', placeholder: 'ул. Абая, 15' }, { key: 'phone', label: 'Телефон', placeholder: '+7 727 123-45-67' }] as const).map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
                    <input value={config[key] as string} onChange={e => setConfig(c => ({ ...c, [key]: e.target.value }))} placeholder={placeholder} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400 transition-colors" />
                  </div>
                ))}
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">График работы</label>
                  <input value={config.schedule} onChange={e => setConfig(c => ({ ...c, schedule: e.target.value }))} placeholder="Пн–Сб 09:00–19:00" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400 transition-colors" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-4">Пароль админки</h2>
              <div className="flex gap-3 max-w-sm">
                <input type="password" id="newPwd" placeholder="Новый пароль" className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400 transition-colors" />
                <button onClick={() => { const v = (document.getElementById('newPwd') as HTMLInputElement).value.trim(); if (v.length < 4) { showStatus('Минимум 4 символа', false); return; } localStorage.setItem('adminPassword', v); setSavedPwd(v); (document.getElementById('newPwd') as HTMLInputElement).value = ''; showStatus('Пароль изменён ✓', true); }} className="bg-blue-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors">Сохранить</button>
              </div>
            </div>
          </div>
        )}

        {/* ── ЗАПИСИ ── */}
        {tab === 'Записи' && (
          <div>
            {/* Фильтры */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 flex flex-wrap gap-3">
              <input value={apptSearch} onChange={e => setApptSearch(e.target.value)} placeholder="Поиск по имени, телефону, врачу..." className="flex-1 min-w-[200px] border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
              <select value={apptStatus} onChange={e => setApptStatus(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400">
                <option value="">Все статусы</option>
                {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <select value={apptDoctor} onChange={e => setApptDoctor(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400">
                <option value="">Все врачи</option>
                {uniqueDoctors.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <input type="date" value={apptDate} onChange={e => setApptDate(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
              <button onClick={loadAppointments} className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700">Найти</button>
            </div>

            {apptLoading && <p className="text-gray-500 text-sm text-center py-8">Загрузка...</p>}
            {!apptLoading && appointments.length === 0 && <p className="text-gray-400 text-sm text-center py-8">Записей нет</p>}

            {/* Таблица */}
            {!apptLoading && appointments.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {['Клиент', 'Услуга', 'Врач', 'Дата / Время', 'Статус', ''].map((h, i) => (
                          <th key={i} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {appointments.map(a => (
                        <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-3">
                            <p className="font-medium text-gray-900 text-sm">{a.user_name}</p>
                            <p className="text-xs text-gray-400">{a.user_phone}</p>
                          </td>
                          <td className="px-3 py-3 text-gray-600 text-sm">{a.service}</td>
                          <td className="px-3 py-3 text-gray-600 text-sm">{a.doctor_name}</td>
                          <td className="px-3 py-3 text-gray-600 text-sm whitespace-nowrap">
                            <p>{fmtDay(a.date)}</p>
                            <p className="text-xs text-gray-400">{a.time_slot}</p>
                          </td>
                          <td className="px-3 py-3">
                            <select value={a.status} onChange={e => updateApptStatus(a.id, e.target.value)} className={`text-xs border rounded-lg px-2 py-1 outline-none font-medium ${STATUS_COLOR[a.status] ?? 'bg-gray-100 text-gray-600'}`}>
                              {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex gap-1.5">
                              <button onClick={() => openClientChat(a.user_name, a.user_phone)} className="text-xs text-blue-600 border border-blue-200 px-2 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                                💬
                              </button>
                              <a href={`https://wa.me/${a.user_phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 border border-green-200 px-2 py-1.5 rounded-lg hover:bg-green-50 transition-colors">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.116 1.528 5.845L.057 23.927l6.235-1.636A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.368l-.36-.214-3.7.971.988-3.608-.235-.372A9.818 9.818 0 1112 21.818z"/></svg>
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              </div>
            )}
          </div>
        )}

        {/* ── ВРАЧИ ── */}
        {tab === 'Врачи' && (
          <div className="space-y-4">
            {/* Список врачей */}
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-gray-900">Врачи клиники</h2>
              <button onClick={() => { setEditingDoctor({ name: '', specialization: '', working_days: [], work_start: '09:00', work_end: '18:00', break_start: '13:00', break_end: '14:00' }); setAddingDoctor(true); }} className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700">+ Добавить врача</button>
            </div>

            {doctorLoading && <p className="text-gray-500 text-sm">Загрузка...</p>}

            {/* Форма добавления/редактирования */}
            {editingDoctor && (
              <div className="bg-white rounded-2xl border border-blue-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4">{addingDoctor ? 'Новый врач' : 'Редактировать врача'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Имя</label>
                    <input value={editingDoctor.name ?? ''} onChange={e => setEditingDoctor(d => ({ ...d!, name: e.target.value }))} placeholder="Айкын" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Специализация</label>
                    <input value={editingDoctor.specialization ?? ''} onChange={e => setEditingDoctor(d => ({ ...d!, specialization: e.target.value }))} placeholder="стоматолог-терапевт" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Начало работы</label>
                    <input type="time" value={editingDoctor.work_start ?? '09:00'} onChange={e => setEditingDoctor(d => ({ ...d!, work_start: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Конец работы</label>
                    <input type="time" value={editingDoctor.work_end ?? '18:00'} onChange={e => setEditingDoctor(d => ({ ...d!, work_end: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Перерыв с</label>
                    <input type="time" value={editingDoctor.break_start ?? '13:00'} onChange={e => setEditingDoctor(d => ({ ...d!, break_start: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Перерыв до</label>
                    <input type="time" value={editingDoctor.break_end ?? '14:00'} onChange={e => setEditingDoctor(d => ({ ...d!, break_end: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="text-xs font-semibold text-gray-500 mb-2 block">Рабочие дни</label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map(d => {
                      const selected = (editingDoctor.working_days ?? []).includes(d);
                      return (
                        <button key={d} onClick={() => setEditingDoctor(doc => ({ ...doc!, working_days: selected ? (doc!.working_days ?? []).filter(x => x !== d) : [...(doc!.working_days ?? []), d] }))} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{d}</button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={saveDoctor} className="bg-blue-600 text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-blue-700">Сохранить</button>
                  <button onClick={() => { setEditingDoctor(null); setAddingDoctor(false); }} className="text-sm text-gray-500 px-4 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50">Отмена</button>
                </div>
              </div>
            )}

            {/* Карточки врачей */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {doctors.map(doc => (
                <div key={doc.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-gray-900">{doc.name}</p>
                      <p className="text-sm text-gray-500">{doc.specialization}</p>
                      <p className="text-xs text-gray-400 mt-1">{(doc.working_days ?? []).join(', ')} · {doc.work_start}–{doc.work_end}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingDoctor({ ...doc }); setAddingDoctor(false); }} className="text-xs text-blue-600 hover:text-blue-800 px-3 py-1.5 border border-blue-200 rounded-lg">Изменить</button>
                      <button onClick={() => deleteDoctor(doc.id)} className="text-xs text-red-500 hover:text-red-700 px-3 py-1.5 border border-red-200 rounded-lg">Удалить</button>
                    </div>
                  </div>

                  {/* Schedule section */}
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Расписание</p>
                    <div className="flex gap-2 mb-3">
                      <input type="date" value={scheduleDoctor?.id === doc.id ? scheduleDate : ''} onChange={e => { setScheduleDate(e.target.value); setScheduleDoctor(doc); if (e.target.value) loadSchedule(doc.id, e.target.value); }} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-400" />
                      <button onClick={() => { setScheduleDoctor(doc); generateSlots(); }} disabled={scheduleDoctor?.id !== doc.id || !scheduleDate} className="text-xs bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 disabled:opacity-40">Создать слоты</button>
                    </div>

                    {scheduleDoctor?.id === doc.id && scheduleLoading && <p className="text-xs text-gray-400">Загрузка...</p>}
                    {scheduleDoctor?.id === doc.id && !scheduleLoading && Object.keys(scheduleSlots).length > 0 && (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {Object.entries(scheduleSlots).map(([date, slots]) => (
                          <div key={date}>
                            <p className="text-xs font-semibold text-gray-400 mb-1">{fmtDay(date)}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {slots.map((s: SlotInfo) => (
                                <div key={s.id} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs border ${s.is_booked ? 'bg-red-50 border-red-200 text-red-600' : s.is_blocked ? 'bg-gray-100 border-gray-200 text-gray-400' : 'bg-green-50 border-green-200 text-green-700'}`}>
                                  <span>{s.time_slot}</span>
                                  {!s.is_booked && (
                                    <button onClick={() => toggleBlock(s.id, s.is_blocked)} className="ml-0.5 opacity-60 hover:opacity-100">{s.is_blocked ? '▶' : '⏸'}</button>
                                  )}
                                  {!s.is_booked && (
                                    <button onClick={() => deleteSlot(s.id)} className="ml-0.5 opacity-40 hover:opacity-100 text-red-500">×</button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {!doctorLoading && doctors.length === 0 && <p className="text-gray-400 text-sm text-center py-8">Врачей ещё нет. Добавьте первого.</p>}
          </div>
        )}

        {/* ── ЧАТЫ ── */}
        {tab === 'Чаты' && (
          <div className="flex gap-4" style={{ minHeight: '500px' }}>
            {/* Список */}
            <div className="w-72 flex-shrink-0 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Последние разговоры</p>
              {chatsLoading && <p className="text-gray-400 text-sm">Загрузка...</p>}
              {!chatsLoading && chats.length === 0 && <p className="text-gray-400 text-sm">Чатов пока нет</p>}
              {chats.map(c => {
                const first = c.messages.find(m => m.role === 'user')?.content ?? '(пусто)';
                const isSelected = selectedChat?.id === c.id;
                return (
                  <button key={c.id} onClick={() => setSelectedChat(c)}
                    className={`w-full text-left rounded-xl p-3 border transition-colors ${isSelected ? 'border-blue-400 bg-blue-50' : 'bg-white border-gray-100 hover:border-blue-200'}`}>
                    <p className="text-xs text-gray-400 mb-1">{fmtDate(c.created_at)}</p>
                    <p className="text-sm text-gray-700 line-clamp-2">{first}</p>
                    <p className="text-xs text-gray-400 mt-1">{c.messages.length} сообщ.</p>
                  </button>
                );
              })}
            </div>

            {/* Просмотр чата */}
            {selectedChat ? (
              <div className="flex-1 bg-white rounded-2xl border border-gray-100 flex flex-col overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">Разговор от {fmtDate(selectedChat.created_at)}</p>
                  <p className="text-xs text-gray-400">{selectedChat.messages.length} сообщений</p>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50">
                  {selectedChat.messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'}`}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 bg-white rounded-2xl border border-gray-100 flex items-center justify-center">
                <p className="text-gray-400 text-sm">Выберите разговор слева</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {/* ── ПАНЕЛЬ ЧАТА КЛИЕНТА ── */}
    {clientChatPanel && (
      <div className="fixed inset-0 z-50 flex">
        <div className="flex-1 bg-black/40" onClick={() => setClientChatPanel(null)} />
        <div className="w-full max-w-md bg-white flex flex-col shadow-2xl">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
            <div>
              <p className="font-bold text-gray-900">{clientChatPanel.name}</p>
              <p className="text-sm text-gray-500">{clientChatPanel.phone}</p>
            </div>
            <button onClick={() => setClientChatPanel(null)} className="text-gray-400 hover:text-gray-700 transition-colors">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          {clientChatLoading && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-gray-400">Загрузка...</p>
            </div>
          )}
          {!clientChatLoading && clientChatPanel.chats.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-gray-400 text-sm">Чатов не найдено</p>
            </div>
          )}
          {!clientChatLoading && clientChatPanel.chats.length > 0 && (
            <div className="flex-1 overflow-y-auto">
              {clientChatPanel.chats.map((chat, ci) => (
                <div key={chat.id}>
                  {clientChatPanel.chats.length > 1 && (
                    <div className="px-5 py-2 bg-gray-50 border-b border-gray-100">
                      <p className="text-xs text-gray-400 font-medium">Разговор {ci + 1} — {fmtDate(chat.created_at)}</p>
                    </div>
                  )}
                  <div className="p-4 space-y-3">
                    {chat.messages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                          {m.content}
                        </div>
                      </div>
                    ))}
                  </div>
                  {ci < clientChatPanel.chats.length - 1 && <div className="border-t border-gray-200 mx-4" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )}
    </>
  );
}
