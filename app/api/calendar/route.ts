import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  // Month overview mode
  if (from && to) {
    const [{ data: slots }, { data: appointments }] = await Promise.all([
      supabase.from('doctor_schedules').select('date, is_blocked').gte('date', from).lte('date', to),
      supabase.from('appointments').select('date').gte('date', from).lte('date', to).neq('status', 'cancelled'),
    ]);

    const bookedDays = new Set((appointments ?? []).map(a => a.date));
    const slotDays = new Set((slots ?? []).filter(s => !s.is_blocked).map(s => s.date));
    const byDay: Record<string, string> = {};

    for (const d of Array.from(slotDays)) {
      byDay[d] = bookedDays.has(d) ? 'mixed' : 'free';
    }
    for (const d of Array.from(bookedDays)) {
      if (!slotDays.has(d)) byDay[d] = 'booked';
    }

    return NextResponse.json({ byDay });
  }

  // Day detail mode
  const selectedDate = date ?? new Date().toISOString().split('T')[0];

  const [{ data: doctors }, { data: slots }, { data: appointments }] = await Promise.all([
    supabase.from('doctors').select('id, name, specialization').order('name'),
    supabase.from('doctor_schedules').select('*').eq('date', selectedDate).order('time_slot'),
    supabase.from('appointments').select('doctor_id, time_slot, user_name, user_phone, service, status').eq('date', selectedDate).neq('status', 'cancelled'),
  ]);

  const apptMap: Record<string, { user_name: string; user_phone: string; service: string }> = {};
  for (const a of appointments ?? []) {
    apptMap[`${a.doctor_id}_${a.time_slot}`] = { user_name: a.user_name, user_phone: a.user_phone, service: a.service };
  }

  const allTimes = Array.from(new Set((slots ?? []).map(s => s.time_slot))).sort();

  const grid: Record<string, Record<string, { status: 'free' | 'booked' | 'blocked'; patient?: { name: string; phone: string; service: string } }>> = {};
  for (const time of allTimes) {
    grid[time] = {};
    for (const doc of doctors ?? []) {
      const slot = (slots ?? []).find(s => s.doctor_id === doc.id && s.time_slot === time);
      if (!slot) continue;
      const appt = apptMap[`${doc.id}_${time}`];
      if (appt) {
        grid[time][doc.id] = { status: 'booked', patient: { name: appt.user_name, phone: appt.user_phone, service: appt.service } };
      } else if (slot.is_blocked) {
        grid[time][doc.id] = { status: 'blocked' };
      } else {
        grid[time][doc.id] = { status: 'free' };
      }
    }
  }

  return NextResponse.json({ doctors: doctors ?? [], times: allTimes, grid });
}
