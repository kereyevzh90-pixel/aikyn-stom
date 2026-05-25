'use client';
import { useEffect, useState } from 'react';

type Message = { role: string; content: string };
type Chat = { id: string; created_at: string; messages: Message[] };
type Booking = { id: string; created_at: string; name: string; phone: string; preferred_time: string; status: string };

export default function ManagerPage() {
  const [tab, setTab] = useState<'chats' | 'bookings'>('bookings');
  const [chats, setChats] = useState<Chat[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/chats').then(r => r.json()),
      fetch('/api/bookings').then(r => r.json()),
    ]).then(([c, b]) => {
      setChats(Array.isArray(c) ? c : []);
      setBookings(Array.isArray(b) ? b : []);
      setLoading(false);
    });
  }, []);

  async function updateStatus(id: string, status: string) {
    await fetch('/api/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  }

  const statusColor: Record<string, string> = {
    new: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const statusLabel: Record<string, string> = {
    new: 'Новая',
    confirmed: 'Подтверждена',
    cancelled: 'Отменена',
  };

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Панель менеджера</h1>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('bookings')}
            className={`px-5 py-2 rounded-lg font-medium transition-colors ${tab === 'bookings' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border'}`}
          >
            Записи {bookings.length > 0 && <span className="ml-1 text-xs">({bookings.filter(b => b.status === 'new').length} новых)</span>}
          </button>
          <button
            onClick={() => setTab('chats')}
            className={`px-5 py-2 rounded-lg font-medium transition-colors ${tab === 'chats' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border'}`}
          >
            История чатов ({chats.length})
          </button>
        </div>

        {loading && <p className="text-gray-500">Загрузка...</p>}

        {!loading && tab === 'bookings' && (
          <div className="space-y-3">
            {bookings.length === 0 && <p className="text-gray-500">Записей пока нет</p>}
            {bookings.map(b => (
              <div key={b.id} className="bg-white rounded-xl p-4 shadow-sm border flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900">{b.name}</p>
                  <p className="text-sm text-gray-600">{b.phone}</p>
                  {b.preferred_time && <p className="text-sm text-gray-500">Время: {b.preferred_time}</p>}
                  <p className="text-xs text-gray-400 mt-1">{formatDate(b.created_at)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {statusLabel[b.status] ?? b.status}
                  </span>
                  {b.status === 'new' && (
                    <>
                      <button onClick={() => updateStatus(b.id, 'confirmed')} className="px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700">Подтвердить</button>
                      <button onClick={() => updateStatus(b.id, 'cancelled')} className="px-3 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600">Отменить</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && tab === 'chats' && (
          <div className="flex gap-4">
            <div className="w-72 space-y-2 flex-shrink-0">
              {chats.length === 0 && <p className="text-gray-500">Чатов пока нет</p>}
              {chats.map(c => {
                const firstMsg = c.messages.find(m => m.role === 'user')?.content ?? '(пустой чат)';
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedChat(c)}
                    className={`w-full text-left bg-white rounded-xl p-3 shadow-sm border transition-colors hover:border-blue-400 ${selectedChat?.id === c.id ? 'border-blue-500' : ''}`}
                  >
                    <p className="text-xs text-gray-400">{formatDate(c.created_at)}</p>
                    <p className="text-sm text-gray-700 mt-1 line-clamp-2">{firstMsg}</p>
                    <p className="text-xs text-gray-400 mt-1">{c.messages.length} сообщений</p>
                  </button>
                );
              })}
            </div>

            {selectedChat && (
              <div className="flex-1 bg-white rounded-xl shadow-sm border p-4 max-h-[600px] overflow-y-auto">
                <p className="text-xs text-gray-400 mb-4">{formatDate(selectedChat.created_at)}</p>
                <div className="space-y-3">
                  {selectedChat.messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
