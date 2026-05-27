import { NextRequest, NextResponse } from 'next/server';
import { readConfig } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import type { FaqItem } from '@/types/config';

let configCache: Awaited<ReturnType<typeof readConfig>> | null = null;
let configCachedAt = 0;
async function getCachedConfig() {
  if (configCache && Date.now() - configCachedAt < 60_000) return configCache;
  configCache = await readConfig();
  configCachedAt = Date.now();
  return configCache;
}

function findFaq(question: string, faq: FaqItem[]): string | null {
  const q = question.toLowerCase();
  for (const item of faq) {
    const keywords = item.q.toLowerCase().split(/[\s,،]+/).filter(Boolean);
    if (keywords.some(k => q.includes(k))) return item.a;
  }
  return null;
}

function stripThinking(text: string): string {
  // Extract [ОТВЕТ]...[/ОТВЕТ] or [ОТВЕТ]... without closing tag
  const tagMatch = text.match(/\[ОТВЕТ\]([\s\S]*?)(?:\[\/ОТВЕТ\]|$)/i);
  if (tagMatch) return tagMatch[1].trim();

  // Fallback: strip <think> style and English-heavy lines
  const lines = text.split('\n');
  const filtered = lines.filter(line => {
    const t = line.trim();
    if (!t) return true;
    const cyr = (t.match(/[а-яёА-ЯЁ]/g) || []).length;
    const lat = (t.match(/[a-zA-Z]/g) || []).length;
    return cyr > lat;
  });
  return filtered.join('\n').trim() || text.trim();
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const config = await getCachedConfig();
    const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === 'user')?.content ?? '';

    const faqHit = findFaq(lastUserMsg, config.faq);

    let systemText = `ФОРМАТ ОТВЕТА: Напиши свой ответ клиенту СТРОГО в теге: [ОТВЕТ]текст ответа[/ОТВЕТ]. Ничего кроме этого тега. Никаких рассуждений, анализа, проверок — только тег с готовым ответом.\n\n${config.systemPrompt}`;
    systemText += `\n\nДанные клиники:\n- Название: ${config.clinicName}\n- Город: ${config.city}\n- Адрес: ${config.address}\n- Телефон: ${config.phone}\n- График: ${config.schedule}`;

    if (faqHit) {
      systemText += `\n\n[ВАЖНО: На этот вопрос есть готовый ответ клиники. Используй именно его как основу]\nОтвет: ${faqHit}`;
    }

    const scheduleKeywords = ['свободн', 'занят', 'расписан', 'запис', 'время', 'слот', 'прием', 'приём', 'когда', 'сегодня', 'завтра', 'доктор', 'врач'];
    if (scheduleKeywords.some(k => lastUserMsg.toLowerCase().includes(k))) {
      try {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        const [{ data: doctors }, { data: slots }, { data: appts }] = await Promise.all([
          supabase.from('doctors').select('id, name, specialization'),
          supabase.from('doctor_schedules').select('doctor_id, date, time_slot, is_blocked').in('date', [today, tomorrow]).order('date').order('time_slot'),
          supabase.from('appointments').select('doctor_id, date, time_slot').in('date', [today, tomorrow]).neq('status', 'cancelled'),
        ]);
        if (doctors && doctors.length > 0) {
          const bookedSet = new Set((appts ?? []).map((a: { doctor_id: string; date: string; time_slot: string }) => `${a.doctor_id}_${a.date}_${a.time_slot}`));
          let schedInfo = '\n\nРАСПИСАНИЕ КЛИНИКИ (актуальное):';
          for (const doc of doctors) {
            const freeSlots = (slots ?? []).filter((s: { doctor_id: string; date: string; time_slot: string; is_blocked: boolean }) => s.doctor_id === doc.id && !s.is_blocked && !bookedSet.has(`${s.doctor_id}_${s.date}_${s.time_slot}`));
            if (freeSlots.length === 0) {
              schedInfo += `\n- ${doc.name} (${doc.specialization}): нет свободных мест`;
            } else {
              const byDate: Record<string, string[]> = {};
              for (const s of freeSlots) { if (!byDate[s.date]) byDate[s.date] = []; byDate[s.date].push(s.time_slot); }
              schedInfo += `\n- ${doc.name} (${doc.specialization}): ` + Object.entries(byDate).map(([d, times]) => `${d}: ${times.join(', ')}`).join('; ');
            }
          }
          systemText += schedInfo;
        }
      } catch { /* ignore */ }
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ text: 'OPENROUTER_API_KEY не задан.' });
    }

    const models = [
      'google/gemma-4-26b-a4b-it:free',
      'google/gemma-4-31b-it:free',
      'deepseek/deepseek-v4-flash:free',
      'nvidia/nemotron-3-super-120b-a12b:free',
    ];

    const chatMessages = [
      { role: 'system', content: systemText },
      ...messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
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
        body: JSON.stringify({ model, messages: chatMessages, max_tokens: 400, temperature: 0.7, include_reasoning: false }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        lastError = data.error?.message ?? String(res.status);
        continue;
      }

      let text = data.choices?.[0]?.message?.content ?? '';
      if (!text) { lastError = 'Нет ответа'; continue; }

      text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      text = stripThinking(text);

      const allMessages = [...messages, { role: 'assistant', content: text }];
      supabase.from('chats').insert({ messages: allMessages }).then(() => {});

      const bookingKeywords = ['записаться', 'запись', 'записать', 'прием', 'приём', 'прийти', 'попасть', 'свободно', 'окно', 'запишите', 'хочу к', 'когда можно'];
      const bookingFlow = bookingKeywords.some(k => lastUserMsg.toLowerCase().includes(k));

      return NextResponse.json({ text, booking_flow: bookingFlow });
    }

    const friendlyError = lastError.toLowerCase().includes('rate limit')
      ? 'Ассистент временно недоступен. Пожалуйста, позвоните нам напрямую или напишите позже.'
      : 'Ошибка: ' + lastError;
    return NextResponse.json({ text: friendlyError });

  } catch (err) {
    return NextResponse.json({ text: 'Ошибка сервера: ' + String(err) }, { status: 500 });
  }
}
