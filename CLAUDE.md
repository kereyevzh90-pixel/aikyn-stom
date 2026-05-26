# Айкын Стом — стоматологический сайт

## Стек
- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Supabase (база данных + хранилище конфига)
- Vercel (деплой) — aikyn-stom.vercel.app
- OpenRouter API (ИИ чат)

## Структура
- `app/page.tsx` — главная страница (герой, карусель услуг)
- `app/admin/page.tsx` — админ панель (FAQ, промпт, настройки, записи, врачи, календарь, чаты)
- `app/api/chat/route.ts` — ИИ ассистент (OpenRouter, читает расписание из Supabase)
- `app/api/config/route.ts` — конфиг клиники (хранится в Supabase таблице clinic_config)
- `app/api/calendar/route.ts` — данные для календаря (месяц + день)
- `app/api/appointments/` — записи на приём
- `app/api/doctors/` — врачи
- `app/api/schedules/` — расписание слотов
- `lib/storage.ts` — readConfig/writeConfig через Supabase
- `app/globals.css` — все стили

## Supabase таблицы
- `clinic_config` — единственная строка id=1, поле data JSONB (конфиг клиники)
- `doctors` — врачи клиники
- `doctor_schedules` — временные слоты врачей
- `appointments` — записи клиентов
- `chats` — история чатов с ИИ

## Важные детали
- `.env.local` не в git — переменные заданы в Vercel
- Конфиг хранится в Supabase, не в файловой системе (Vercel read-only)
- ИИ читает расписание напрямую из Supabase при вопросах о записи
- Модели OpenRouter: gemma-4-26b, gemma-4-31b, deepseek-v4-flash, nemotron (fallback цепочка)
- Конфиг кешируется в памяти на 60 сек (getCachedConfig) чтобы не делать лишний Supabase запрос
- OpenRouter free tier: лимит запросов в день — при исчерпании ошибка "Rate limit exceeded: free-models-per-day"
- Чат НЕ использует стриминг — простой JSON ответ (NextResponse.json). Vercel hobby = 10сек таймаут
- Бронирование обрабатывается локально во фронте (ChatWidget.tsx) без API при keyword-триггерах
- Изображения: IMG_0967.PNG (десктоп), IMG_0982.PNG (мобайл)
- iPad fix: `center top !important` для 768-1366px

## GitHub
- kereyevzh90-pixel/aikyn-stom
