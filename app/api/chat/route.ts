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

    let systemText = config.systemPrompt;
    systemText += `\n\nДанные клиники:\n- Название: ${config.clinicName}\n- Город: ${config.city}\n- Адрес: ${config.address}\n- Телефон: ${config.phone}\n- График: ${config.schedule}`;

    if (faqHit) {
      systemText += `\n\n[ВАЖНО: На этот вопрос есть готовый ответ клиники. Используй именно его как основу]\nОтвет: ${faqHit}`;
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
