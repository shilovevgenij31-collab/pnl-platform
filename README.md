# Перезагрузка прибыльности — AI-платформа

Платформа с двумя AI-агентами для диагностики прибыльности бизнеса.

**P&L Agent** — финансовый анализ: где бизнес теряет прибыль по цифрам.
**Goldratt Agent** — системная диагностика: главное ограничение роста по Теории ограничений.

### Загрузка данных

Формы поддерживают два способа ввода данных:
- **Загрузка файла** — drag & drop или выбор файла: `.txt`, `.csv`, `.md`, `.json`
- **Вставка текстом** — скопировать из Excel / Google Sheets и вставить в textarea

P&L Agent поддерживает `.xlsx` / `.xls`: после загрузки Excel показывает список листов, автоматически выбирает лучший лист по quality score, показывает preview и блокирует запуск AI, если лист не похож на заполненный P&L. PDF parser пока не реализован.

### Excel ingestion и шаблон P&L

- Excel-листы оцениваются до AI: строки, колонки, ненулевые числа, ключевые слова выручки/расходов/прибыли, ошибки формул.
- Перед анализом пользователь видит preview “Проверьте данные перед анализом”.
- При hard block Claude не вызывается и отчёт не создаётся.
- Шаблон Excel доступен в `public/templates/pnl-template.xlsx` и по URL `/templates/pnl-template.xlsx`.
- Google Sheets CTA предусмотрен в UI; ссылку нужно добавить в constant `GOOGLE_SHEETS_TEMPLATE_URL`, когда шаблон будет опубликован.
- В отчёте P&L показывается блок “Данные, использованные для анализа” на основе сохранённого `pnl_text`.

## Быстрый старт

```bash
cd platform
npm install
cp .env.example .env.local  # заполните ключи
npm run dev
```

Открыть: [http://localhost:3000](http://localhost:3000)

## Переменные окружения

Скопируйте `.env.example` в `.env.local` и заполните ключи:

```env
# AI Provider — "openrouter" (default) or "claude"
AI_PROVIDER=openrouter

# OpenRouter (needed when AI_PROVIDER=openrouter)
OPENROUTER_API_KEY=
OPENROUTER_MODEL=google/gemma-4-31b-it:free

# Claude / Anthropic (needed when AI_PROVIDER=claude)
ANTHROPIC_API_KEY=
CLAUDE_MODEL=claude-3-5-sonnet-latest

# Supabase — always required for saving reports
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Public URL of the deployment
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> `SUPABASE_SERVICE_ROLE_KEY` используется исключительно на сервере (`src/lib/supabase/server.ts`). Никогда не передаётся в браузер.

## Switching AI provider

AI-провайдер переключается через переменную `AI_PROVIDER`.  
P&L и Goldratt промпты не меняются — оба агента используют общий provider layer.

### OpenRouter (default)

```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=google/gemma-4-31b-it:free
```

OpenRouter поддерживает бесплатные модели, но они нестабильны на free tier.  
Для production используйте платную модель через OpenRouter или переключитесь на Claude.

### Claude / Anthropic

```env
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-3-5-sonnet-latest
```

`CLAUDE_MODEL` необязателен — без него используется `claude-3-5-sonnet-latest`.

Если `AI_PROVIDER=claude`, но `ANTHROPIC_API_KEY` не задан, приложение не делает silent fallback на OpenRouter: API вернёт `NOT_CONFIGURED`, а в server logs появится запись `[AI] provider=claude missing ANTHROPIC_API_KEY`.

**После изменения env:**
- Локально — перезапустите dev server (`npm run dev`)
- Vercel — нажмите Redeploy в панели управления

### How To Hand Off Claude

Для следующего разработчика достаточно выставить env:

```env
AI_PROVIDER=claude
ANTHROPIC_API_KEY=...
CLAUDE_MODEL=claude-3-5-sonnet-latest
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SITE_URL=...
```

- Если после перезапуска в логах запросов provider всё ещё `openrouter`, значит env не применился.
- У текущего владельца проекта локально может оставаться OpenRouter. Это нормально.
- Excel quality gate, preview и hard block работают до AI и не зависят от выбранной модели.

Supabase env остаются теми же при любом провайдере.

## Supabase Setup

### 1. Создать проект на supabase.com

### 2. Выполнить SQL в редакторе Supabase (SQL Editor):

```sql
CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  name TEXT,
  email TEXT,
  telegram TEXT,
  company TEXT,

  business_type TEXT,
  industry TEXT,
  geography TEXT,
  team TEXT,
  current_revenue TEXT,
  current_margin TEXT,
  target_margin TEXT,
  main_pain TEXT,
  tried_before TEXT,
  extra_context TEXT,

  pnl_text TEXT,
  report TEXT NOT NULL,
  agent_type TEXT DEFAULT 'pnl',
  model_used TEXT,
  status TEXT DEFAULT 'completed',
  error_message TEXT
);
```

### 3. Скопировать ключи из Settings → API

- `NEXT_PUBLIC_SUPABASE_URL` — Project URL
- `SUPABASE_SERVICE_ROLE_KEY` — service_role key (не anon key)

## Два AI-агента

| Агент | URL | Вопрос | Структура |
|-------|-----|--------|-----------|
| P&L Agent | `/analyze?agent=pnl` | Где бизнес теряет прибыль? | 14 разделов |
| Goldratt Agent | `/analyze?agent=goldratt` | Что является главным ограничением? | 12 разделов |

По умолчанию (без параметра) открывается P&L Agent.

## Страницы

| Путь | Описание |
|------|----------|
| `/` | Landing page с описанием обоих агентов |
| `/analyze?agent=pnl` | Форма P&L Agent |
| `/analyze?agent=goldratt` | Форма Goldratt Agent |
| `/report/[id]` | Отчёт по уникальной ссылке (header/badge по agentType) |
| `/report` | Fallback: отчёт из localStorage |
| `/demo/pnl` | Demo P&L-отчёт (статика, без AI и Supabase) |
| `/demo/goldratt` | Demo Goldratt-отчёт (статика, без AI и Supabase) |

## Demo Mode

Платформа поддерживает demo-режим для показа без доступа к AI-провайдеру.

**Когда нужен:** free-модели OpenRouter недоступны или нестабильны (429/503), нужно показать платформу заказчику или провести демо.

**Как работает:**
- `/demo/pnl` — полноценный P&L-отчёт с вымышленной компанией «ТехКонсалт»
- `/demo/goldratt` — полноценный Goldratt-отчёт с вымышленной компанией «РекрутПро»
- Тот же `ReportDisplay` UI, те же цвета и структура, что в реальных отчётах
- Синяя плашка «Демо-отчёт» вверху чётко разграничивает demo от реального

**Точки входа:**
- Landing page `/`: кнопка «Пример» рядом с каждой CTA-кнопкой агента
- Форма `/analyze`: при ошибке AI — ссылка «Посмотреть пример отчёта»

**Файл с demo-данными:** `src/lib/demoReports.ts`

## Текущий flow

```
/ → выбор агента → /analyze?agent=pnl|goldratt
  → POST /api/analyze  { ...formData, agentType }
      ├── выбор system prompt по agentType
      ├── AI генерирует отчёт (OpenRouter)
      └── Supabase: сохранение с agent_type → { id }
  → /report/[id]  (header/badge/цвет по agentType)
```

## agentType

Поле `agentType: 'pnl' | 'goldratt'` передаётся через всю цепочку:
- Форма → API body → system prompt selection → DB `agent_type` → отчёт
- Старые отчёты без `agent_type` получают default `'pnl'`

## Структура проекта

```
src/
├── app/
│   ├── page.tsx                    # Landing page (оба агента)
│   ├── layout.tsx                  # Root layout (dark theme)
│   ├── globals.css                 # Стили темы + markdown стили
│   ├── analyze/
│   │   ├── page.tsx                # Server Component: читает ?agent= param
│   │   └── AnalyzeClient.tsx       # Client Component: агент-выбор + формы
│   ├── report/
│   │   ├── page.tsx                # Fallback (localStorage)
│   │   └── [id]/
│   │       ├── page.tsx            # Server Component: загружает отчёт из DB
│   │       └── ReportDisplay.tsx   # Client Component: UI с агент-специфичным header
│   └── api/analyze/route.ts        # API endpoint
├── lib/
│   ├── ai/
│   │   ├── provider.ts             # Интерфейс AIProvider + AIResponse
│   │   ├── openrouter.ts           # Реализация OpenRouter (возвращает modelUsed)
│   │   ├── index.ts                # Фабрика createAIProvider()
│   │   └── prompts/
│   │       ├── pnlPrompt.ts        # System prompt для P&L Agent
│   │       ├── goldrattPrompt.ts   # System prompt для Goldratt Agent
│   │       └── buildUserPrompt.ts  # User prompt builders по agentType
│   │   └── index.ts                # Фабрика createAIProvider()
│   ├── supabase/
│   │   └── server.ts               # Supabase server-only client
│   ├── repositories/
│   │   └── reportRepository.ts     # saveReportToDatabase / getReportById
│   ├── storage/
│   │   ├── formStorage.ts          # Черновик формы (localStorage)
│   │   └── reportStorage.ts        # Отчёт из localStorage (fallback)
│   ├── prompts.ts                  # System prompt
│   └── types.ts                    # Все общие типы
└── components/ui/                  # shadcn/ui компоненты
```

## AI Provider Layer

Провайдер изолирован за интерфейсом `AIProvider`:

```typescript
export interface AIProvider {
  chat(messages: AIMessage[]): Promise<AIResponse>
  // AIResponse = { content: string; modelUsed: string }
}
```

Фабрика `createAIProvider()` выбирает реализацию по `AI_PROVIDER`:

| `AI_PROVIDER` | Реализация | Ключ |
|---|---|---|
| `openrouter` (default) | `OpenRouterProvider` | `OPENROUTER_API_KEY` |
| `claude` | `ClaudeProvider` | `ANTHROPIC_API_KEY` |

### Подключить Claude

1. Добавьте `ANTHROPIC_API_KEY=sk-ant-...` в `.env.local`
2. Установите `AI_PROVIDER=claude`
3. Перезапустите dev server — всё остальное работает без изменений

## Стек

- **Next.js 16** App Router + TypeScript
- **Tailwind CSS v4** + shadcn/ui + lucide-react
- **react-markdown** + remark-gfm
- **OpenRouter** — прокси к бесплатным AI моделям
- **Supabase** — PostgreSQL база данных для хранения отчётов

## Обработка ошибок

API всегда возвращает предсказуемую структуру:

**Success:**
```json
{ "id": "uuid", "status": "success" }
```

**Error:**
```json
{ "error": "safe user-facing message", "code": "ERROR_CODE" }
```

**Коды ошибок:** `VALIDATION_ERROR` · `RATE_LIMITED` · `NOT_CONFIGURED` · `AI_TIMEOUT` · `AI_RATE_LIMITED` · `AI_PROVIDER_ERROR` · `AI_EMPTY_RESPONSE` · `DB_SAVE_FAILED` · `INTERNAL_ERROR`

**Особый случай — `DB_SAVE_FAILED`:** AI сгенерировал отчёт, но Supabase не сохранил.
API возвращает:
```json
{ "error": "...", "code": "DB_SAVE_FAILED", "report": "...markdown...", "company": "..." }
```
Клиент сохраняет отчёт в localStorage и показывает жёлтое предупреждение с кнопкой «Открыть временный отчёт».

## Безопасность

- `SUPABASE_SERVICE_ROLE_KEY` — **только сервер**. Никогда не попадает в браузер.
- Не используется Supabase клиент в Client Components.
- Supabase client инициализируется только в `src/lib/supabase/server.ts`.

## Известные предупреждения

При запуске `npm run build` может появляться:
```
Warning: Next.js inferred your workspace root...
Detected additional lockfiles: C:\Users\...\package-lock.json
```
Это безопасное предупреждение о нескольких `package-lock.json` в родительских папках. Не влияет на работу.

## Деплой на Vercel

```bash
npx vercel --prod
```

Добавьте все переменные окружения в настройках Vercel проекта.

## P1 hardening перед деплоем

- `POST /api/analyze` имеет MVP in-memory rate limit: 5 запросов за 10 минут на IP (`x-forwarded-for`, `x-real-ip`, fallback `unknown`). Это защищает MVP от случайного перерасхода, но не является production-grade distributed limiter.
- AI/OpenRouter ошибки нормализованы: клиент получает безопасные коды `NOT_CONFIGURED`, `AI_TIMEOUT`, `AI_RATE_LIMITED`, `AI_PROVIDER_ERROR`, `AI_EMPTY_RESPONSE`; raw upstream errors остаются только в server logs.
- `model_used` сохраняется в Supabase и отображается на `/report/[id]`. Для старых отчётов без значения UI показывает `Model not recorded`, для demo — `Demo / OpenRouter`.
- Route handler `/api/analyze` закреплён за Node.js runtime и задаёт `maxDuration = 180` для long-running AI requests на Vercel.
- `next.config.ts` задаёт `turbopack.root` на папку `platform`, чтобы убрать warning про parent `package-lock.json`.

### Vercel env

Полный список переменных для Vercel:

```env
# Выбор провайдера (обязательно)
AI_PROVIDER=openrouter

# OpenRouter — заполнить если AI_PROVIDER=openrouter
OPENROUTER_API_KEY=
OPENROUTER_MODEL=google/gemma-4-31b-it:free

# Claude — заполнить если AI_PROVIDER=claude
ANTHROPIC_API_KEY=
CLAUDE_MODEL=claude-3-5-sonnet-latest

# Supabase — нужны всегда
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
```

- Если используется OpenRouter — Claude env можно оставить пустыми
- Если используется Claude — OpenRouter env можно оставить пустыми
- Supabase env нужны всегда для сохранения отчётов

### Production note

AI-запросы могут быть долгими. Для production лучше заменить in-memory limiter на Redis/Upstash/Vercel KV, а генерацию отчётов вынести в queue/background jobs. Также проверьте, что выбранный тариф/настройка Vercel выдерживает long-running AI requests.

### OpenRouter Free Router

- Primary model по умолчанию: `google/gemma-4-31b-it:free` (задаётся через `OPENROUTER_MODEL`)
- Если primary не ответил, provider пробует fallback: `openai/gpt-oss-120b:free`, `nvidia/nemotron-3-super-120b-a12b:free`
- `modelUsed` старается сохранить реальную модель из ответа OpenRouter; если router её не раскрыл, сохраняется отправленная модель
