import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? '';
  const doctor = searchParams.get('doctor') ?? '';
  const date = searchParams.get('date') ?? '';

  let query = supabase.from('appointments').select('*').order('created_at', { ascending: false }).limit(200);

  if (status) query = query.eq('status', status);
  if (doctor) query = query.eq('doctor_name', doctor);
  if (date) query = query.eq('date', date);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let result = data ?? [];
  if (search) {
    const s = search.toLowerCase();
    result = result.filter(a =>
      a.user_name?.toLowerCase().includes(s) ||
      a.user_phone?.toLowerCase().includes(s) ||
      a.doctor_name?.toLowerCase().includes(s)
    );
  }

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { user_name, user_phone, service, doctor_id, doctor_name, date, time_slot } = body;

  if (!user_name || !user_phone || !service || !doctor_name || !date || !time_slot) {
    return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 });
  }

  // Check slot not already taken
  const { data: existing } = await supabase
    .from('appointments')
    .select('id')
    .eq('doctor_id', doctor_id)
    .eq('date', date)
    .eq('time_slot', time_slot)
    .neq('status', 'cancelled')
    .single();

  if (existing) return NextResponse.json({ error: 'Этот слот уже занят' }, { status: 409 });

  const { data, error } = await supabase
    .from('appointments')
    .insert({ user_name, user_phone, service, doctor_id, doctor_name, date, time_slot })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json();
  const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
