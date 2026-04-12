# RU Hosting — экстренный переезд фронта из Netlify на российский VPS

## Зачем

Netlify через Cloudflare Free — **не работает стабильно для всех пользователей из РФ**.
Cloudflare Free не даёт гарантированных российских POP, трафик идёт через AMS/FRA,
RKN периодически банит эти CF IP-диапазоны. Результат: у части пользователей
(в т.ч. дизайнеров, заказчиков) сайт просто не открывается без VPN.

Это не фиксится на уровне DNS. Нужен **серверный фикс** — хостинг фронта на
российском IP, который RKN не трогает.

## Архитектура после переезда

```
archflow.ru
  │
  ├─ DNS: Cloudflare (только DNS, proxy OFF — серая тучка)
  │
  └─ A-запись → IP российского VPS (Timeweb / Beget / Selectel)
       │
       └─ nginx (443) → Node.js standalone (3000)
                           │
                           ├─ /api/*     → Next.js API routes (auth/signup, feedback, invite, push, ...)
                           └─ /**        → SPA shell + client-side routing

Supabase остаётся на Beget (oyklaglogmaniet.beget.app) — там и так РФ, проблем нет.
```

Netlify остаётся как backup на пару недель, потом выключается.

## Выбор хоста

| Хост          | VPS план                  | Цена    | Плюсы                                    | Минусы                        |
|---------------|---------------------------|---------|------------------------------------------|-------------------------------|
| **Timeweb**   | Cloud VPS, 1CPU/1GB/15GB  | ~380₽   | Быстрое оформление, панель, DDoS вкл.    | Лимиты на Free тарифах        |
| **Beget**     | Cloud VPS Start           | ~350₽   | Уже там Supabase, одна панель            | Инфра попроще                 |
| **Selectel**  | Cloud Server xs1.tiny     | ~450₽   | Enterprise-grade, надёжный               | UI сложнее                    |
| **RuVDS**     | Start                     | ~250₽   | Самый дешёвый                            | Бывают жалобы на стабильность |

**Рекомендация**: Timeweb Cloud — оптимум цена/простота. Оформление 5 мин, VPS поднимается за 2 мин.

## Требования к VPS

- **OS**: Ubuntu 22.04 LTS или 24.04 LTS
- **Регион**: ru-1 (Москва) или ru-2 (Петербург)
- **CPU / RAM**: 1 vCPU / 1 GB RAM (минимум), 2 GB лучше
- **Диск**: 15 GB NVMe
- **Публичный IP**: обязательно статический
- **SSH**: ключ загружен в панели при создании

## Шаги деплоя

### 1. Оформление VPS (5 минут)
1. Создать аккаунт Timeweb (если нет) → https://timeweb.cloud
2. Cloud Servers → Create → выбрать:
   - Ubuntu 22.04
   - Регион ru-1
   - Тариф Cloud-1 (1 CPU, 1 GB)
   - SSH key (или создать новый)
3. Дождаться выдачи IP (~2 минуты)
4. Записать IP, например `5.35.XX.XX`

### 2. Начальная настройка сервера (15 минут)

См. `./01-server-setup.md` (Node.js, nginx, certbot, firewall, user).

### 3. Первый деплой (10 минут)

См. `./02-first-deploy.md` (standalone build → rsync → systemd → nginx).

### 4. Переключение DNS (5 минут)

См. `./03-dns-cutover.md` (Cloudflare A-запись + proxy OFF).

### 5. Continuous updates

См. `./04-deploy-updates.md` (git pull → npm build → rsync → systemctl restart).

## Секреты сервера

На VPS нужен `.env.production` с:
```
NEXT_PUBLIC_SUPABASE_URL=https://oyklaglogmaniet.beget.app
NEXT_PUBLIC_SUPABASE_ANON_KEY=<current>
NEXT_PUBLIC_METRIKA_ID=<current>
RESEND_API_KEY=<current>
TELEGRAM_BOT_TOKEN=<current>
TELEGRAM_CHAT_ID=<current>
OPENAI_API_KEY=<current>
```

Все эти значения можно скопировать из Netlify → Site settings → Environment variables.

## Rollback план

Если что-то сломалось после переключения DNS:
1. В Cloudflare: переключить A-запись обратно на Netlify IPs (75.2.60.5, 99.83.231.61)
2. Включить proxy (оранжевая тучка)
3. Rollback займёт 30 секунд, старый Netlify деплой никуда не делся

## Что дальше

Этот RU VPS — **временное решение** на 1-3 месяца, пока не доехали до Yandex Cloud
staging/prod (Sprint 1-5). После полной миграции VPS можно выключить, либо оставить
как резерв для фронта.
