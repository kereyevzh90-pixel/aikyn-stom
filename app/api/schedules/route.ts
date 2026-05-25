import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function timeToMins(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function minsToTime(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// GET /api/schedules?doctor_id=X  — available slots for booking (grouped by date)
// GET /api/schedules?doctor_id=X&date=YYYY-MM-DD&admin=true  — all slots for admin
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const doctorId = searchParams.get('doctor_id');
  const dateParam = searchParams.get('date');
  const isAdmin = searchParams.get('admin') === 'true';

  if (!doctorId) return NextResponse.json({ error: 'doctor_id required' }, { status: 400 });

  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  let query = supabase
    .from('doctor_schedules')
    .select('*')
    .eq('doctor_id', doctorId)
    .order('date')
    .order('time_slot');

  if (dateParam) {
    query = query.eq('date', dateParam);
  } else {
    query = query.gte('date', today).lte('date', maxDate);
  }

  const { data: slots, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get booked slots
  const { data: booked } = await supabase
    .from('appointments')
    .select('date, time_slot')
    .eq('doctor_id', doctorId)
    .neq('status', 'cancelled')
    .gte('date', dateParam ?? today);

  const bookedSet = new Set((booked ?? []).map((a) => `${a.date}_${a.time_slot}`));

  if (isAdmin) {
    const grouped: Record<string, { id: string; time_slot: string; is_blocked: boolean; is_booked: boolean }[]> = {};
    for (const s of slots ?? []) {
      if (!grouped[s.date]) grouped[s.date] = [];
      grouped[s.date].push({ id: s.id, time_slot: s.time_slot, is_blocked: s.is_blocked, is_booked: bookedSet.has(`${s.date}_${s.time_slot}`) });
    }
    return NextResponse.json(grouped);
  }

  // Public: available slots grouped by date
  const grouped: Record<string, string[]> = {};
  for (const s of slots ?? []) {
    if (s.is_blocked || bookedSet.has(`${s.date}_${s.time_slot}`)) continue;
    if (!grouped[s.date]) grouped[s.date] = [];
    grouped[s.date].push(s.time_slot);
  }

  const result = Object.entries(grouped).map(([date, slotList]) => ({ date, slots: slotList }));
  return NextResponse.json(result);
}

// POST — generate slots for a date OR add single slot
export async function POST(req: NextRequest) {
  const { doctor_id, date, generate, time_slot } = await req.json();

  if (!doctor_id || !date) return NextResponse.json({ error: 'doctor_id and date required' }, { status: 400 });

  if (generate) {
    // Fetch doctor work hours
    const { data: doc } = await supabase.from('doctors').select('work_start,work_end,break_start,break_end').eq('id', doctor_id).single();
    if (!doc) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });

    const start = timeToMins(doc.work_start);
    const end = timeToMins(doc.work_end);
    const bStart = timeToMins(doc.break_start);
    const bEnd = timeToMins(doc.break_end);

    const rows = [];
    for (let t = start; t < end; t += 60) {
      if (t >= bStart && t < bEnd) continue;
      rows.push({ doctor_id, date, time_slot: minsToTime(t) });
    }

    const { error } = await supabase.from('doctor_schedules').upsert(rows, { onConflict: 'doctor_id,date,time_slot' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, count: rows.length });
  }

  if (time_slot) {
    const { error } = await supabase.from('doctor_schedules').upsert({ doctor_id, date, time_slot }, { onConflict: 'doctor_id,date,time_slot' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Provide generate:true or time_slot' }, { status: 400 });
}

// PATCH — block or unblock a slot
export async function PATCH(req: NextRequest) {
  const { id, is_blocked } = await req.json();
  const { error } = await supabase.from('doctor_schedules').update({ is_blocked }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE — remove a slot
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const { error } = await supabase.from('doctor_schedules').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
