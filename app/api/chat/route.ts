import { NextRequest, NextResponse } from 'next/server';
import { readConfig } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import type { FaqItem } from '@/types/config';

function findFaq(question: string, faq: FaqItem[]): string | null {
  const q = question.toLowerCase();
  for (const item of faq) {
    const keywords = item.q.toLowerCase().split(/[\s,،]+/).filter(Boolean);
    if (keywords.some(k => q.includes(k))) return item.a;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const config = await readConfig();
    const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === 'user')?.content ?? '';

    const faqHit = findFaq(lastUserMsg, config.faq);

    let systemText = `ВАЖНО: Отвечай ТОЛЬКО финальным ответом. Никогда не пиши свои мысли, рассуждения, анализ или план ответа. Сразу пиши ответ клиенту.\n\n${config.systemPrompt}`;
    systemText += `\n\nДанные клиники:\n- Название: ${config.clinicName}\n- Город: ${config.city}\n- Адрес: ${config.address}\n- Телефон: ${config.phone}\n- График: ${config.schedule}`;

    if (faqHit) {
      systemText += `\n\n[ВАЖНО: На этот вопрос есть готовый ответ клиники. Используй именно его как основу]\nОтвет: ${faqHit}`;
    }

    // Fetch schedule if user asks about availability
    const scheduleKeywords = ['свободн', 'занят', 'расписан', 'запис', 'время', 'слот', 'прием', 'приём', 'когда', 'сегодня', 'завтра', 'доктор', 'врач'];
    if (scheduleKeywords.some(k => lastUserMsg.toLowerCase().includes(k))) {
      try {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        const [todayRes, tomorrowRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL ? `https://${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname}` : ''}/api/calendar?date=${today}`).catch(() => null),
          fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL ? `https://${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname}` : ''}/api/calendar?date=${tomorrow}`).catch(() => null),
        ]);
        // Use supabase directly instead
        const { supabase: sb } = await import('@/lib/supabase');
        const { data: doctors } = await sb.from('doctors').select('id, name, specialization');
        const { data: slots } = await sb.from('doctor_schedules').select('doctor_id, date, time_slot, is_blocked').in('date', [today, tomorrow]).order('date').order('time_slot');
        const { data: appts } = await sb.from('appointments').select('doctor_id, date, time_slot').in('date', [today, tomorrow]).neq('status', 'cancelled');

        if (doctors && doctors.length > 0) {
          const bookedSet = new Set((appts ?? []).map(a => `${a.doctor_id}_${a.date}_${a.time_slot}`));
          let schedInfo = '\n\nРАСПИСАНИЕ КЛИНИКИ (актуальное):';
          for (const doc of doctors) {
            const docSlots = (slots ?? []).filter(s => s.doctor_id === doc.id && !s.is_blocked);
            const freeSlots = docSlots.filter(s => !bookedSet.has(`${s.doctor_id}_${s.date}_${s.time_slot}`));
            if (freeSlots.length === 0) {
              schedInfo += `\n- ${doc.name} (${doc.specialization}): нет свободных мест на ближайшие дни`;
            } else {
              const byDate: Record<string, string[]> = {};
              for (const s of freeSlots) { if (!byDate[s.date]) byDate[s.date] = []; byDate[s.date].push(s.time_slot); }
              schedInfo += `\n- ${doc.name} (${doc.specialization}): свободно — ` + Object.entries(byDate).map(([d, times]) => `${d}: ${times.join(', ')}`).join('; ');
            }
          }
          systemText += schedInfo;
        }
      } catch { /* ignore schedule errors */ }
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ text: 'OPENROUTER_API_KEY не задан. Добавьте его в переменные окружения.' });
    }

    const models = [
      'google/gemma-4-26b-a4b-it:free',
      'google/gemma-4-31b-it:free',
      'deepseek/deepseek-v4-flash:free',
      'nvidia/nemotron-3-super-120b-a12b:free',
    ];

    const chatMessages = [
      { role: 'system', content: systemText },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    let lastError = '';
    for (const model of models) {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://aikyn-stom.vercel.app',
          'X-Title': 'Aikyn Stom',
        },
        body: JSON.stringify({ model, messages: chatMessages, max_tokens: 400, temperature: 0.7 }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        lastError = data.error?.message ?? String(res.status);
        continue;
      }

      let text = data.choices?.[0]?.message?.content ?? '';
      if (!text) { lastError = 'Нет ответа'; continue; }

      // strip thinking tags from reasoning models
      text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

      // save conversation to Supabase (fire and forget)
      const allMessages = [...messages, { role: 'assistant', content: text }];
      supabase.from('chats').insert({ messages: allMessages }).then(() => {});

      const bookingKeywords = ['записаться', 'запись', 'записать', 'прием', 'приём', 'прийти', 'попасть', 'свободно', 'окно', 'запишите', 'хочу к', 'когда можно'];
      const bookingFlow = bookingKeywords.some(k => lastUserMsg.toLowerCase().includes(k));

      return NextResponse.json({ text, booking_flow: bookingFlow });
    }

    return NextResponse.json({ text: 'Ошибка: ' + lastError });

  } catch (err) {
    return NextResponse.json({ text: 'Ошибка сервера: ' + String(err) }, { status: 500 });
  }
}
