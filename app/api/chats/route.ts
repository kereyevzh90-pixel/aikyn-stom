import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');

  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Если передан телефон — фильтруем по содержимому сообщений
  if (phone) {
    const filtered = (data ?? []).filter((chat: { messages: { content?: string }[] }) =>
      chat.messages.some(m => m.content?.includes(phone))
    );
    return NextResponse.json(filtered);
  }

  return NextResponse.json(data ?? []);
}
