# 02 — Первый деплой

Делается ПОСЛЕ `01-server-setup.md`. Выполняется частично локально (build), частично на сервере.

## Предполагаем

- VPS настроен (см. `01-server-setup.md`)
- IP: `<SERVER_IP>`
- Локально: macOS (или Linux) с проектом в `/Users/evgeny/Desktop/archflow-project`
- У тебя есть доступ к Netlify → Site settings → Environment variables (нужны ключи)

## Шаг 1 — Локально: собрать standalone билд

```bash
cd /Users/evgeny/Desktop/archflow-project/nextjs-src
npm ci
npm run build
```

Build создаст:
- `.next/standalone/server.js` — минимальный Node.js сервер
- `.next/standalone/.next/` — серверный runtime
- `.next/standalone/node_modules/` — dep-ы которые Next не смог заинлайнить
- `.next/static/` — клиентские JS/CSS чанки (нужно скопировать отдельно)
- `public/` — статика (favicon, sw.js, manifest.json, offline.html, иконки)

## Шаг 2 — Локально: собрать release-папку

Создай скрипт `nextjs-src/scripts/build-release.sh` (уже будет создан в этом коммите):

```bash
cd /Users/evgeny/Desktop/archflow-project/nextjs-src
bash scripts/build-release.sh
```

Результат: `/tmp/archflow-release/` содержит готовый standalone-деплой.

## Шаг 3 — Локально: rsync на сервер

```bash
RELEASE_ID=$(date -u +%Y%m%d-%H%M%S)
SERVER=archflow@<SERVER_IP>

rsync -avz --delete \
  /tmp/archflow-release/ \
  ${SERVER}:/home/archflow/releases/${RELEASE_ID}/

# Переключить symlink
ssh ${SERVER} "ln -sfn /home/archflow/releases/${RELEASE_ID} /home/archflow/app"
```

## Шаг 4 — На сервере: создать .env.production

```bash
ssh archflow@<SERVER_IP>
vim /home/archflow/app/.env.production
```

Вставь значения (скопируй из Netlify → Site settings → Environment variables):

```
NODE_ENV=production
PORT=3000
HOSTNAME=127.0.0.1

NEXT_PUBLIC_SUPABASE_URL=https://oyklaglogmaniet.beget.app
NEXT_PUBLIC_SUPABASE_ANON_KEY=<copy>
NEXT_PUBLIC_METRIKA_ID=<copy>

RESEND_API_KEY=<copy>
TELEGRAM_BOT_TOKEN=<copy>
TELEGRAM_CHAT_ID=<copy>
OPENAI_API_KEY=<copy>
```

```bash
chmod 600 /home/archflow/app/.env.production
```

## Шаг 5 — На сервере: установить systemd unit

Скопируй содержимое `docs/migration/ru-hosting/systemd/archflow.service`
(см. файл в репо) в `/etc/systemd/system/archflow.service`:

```bash
sudo vim /etc/systemd/system/archflow.service
# вставь содержимое, сохрани
sudo systemctl daemon-reload
sudo systemctl enable archflow
sudo systemctl start archflow
sudo systemctl status archflow
```

Проверь:
```bash
curl http://127.0.0.1:3000
# должен вернуть HTML Archflow
```

## Шаг 6 — На сервере: установить nginx config

Скопируй содержимое `docs/migration/ru-hosting/nginx/archflow.conf` в
`/etc/nginx/sites-available/archflow.conf`:

```bash
sudo vim /etc/nginx/sites-available/archflow.conf
sudo ln -sf /etc/nginx/sites-available/archflow.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Проверь по IP:
```bash
curl -H "Host: archflow.ru" http://<SERVER_IP>
# должен вернуть HTML Archflow
```

## Шаг 7 — Получить SSL сертификат

**Важно**: DNS ещё указывает на Netlify. Let's Encrypt не сможет выдать сертификат
для archflow.ru пока DNS не переключится. Варианты:

### Вариант A: DNS challenge (без переключения DNS)
```bash
sudo certbot certonly --manual --preferred-challenges dns \
  -d archflow.ru -d www.archflow.ru
```
Следуй инструкциям (создать TXT-запись в Cloudflare).

### Вариант B: HTTP challenge ПОСЛЕ переключения DNS
Делай только после `03-dns-cutover.md`:
```bash
sudo certbot --nginx -d archflow.ru -d www.archflow.ru --non-interactive --agree-tos -m archflow.office@gmail.com
```

Рекомендация: **вариант A** — получи сертификат заранее, чтобы переключение DNS было seamless.

## Шаг 8 — Smoke test

```bash
curl -I https://archflow.ru  # через DNS challenge + Host header
```

Перейди к `03-dns-cutover.md`.

## Чеклист первого деплоя

- [ ] `npm run build` локально без ошибок
- [ ] `build-release.sh` отработал, `/tmp/archflow-release` готов
- [ ] rsync прошёл, `/home/archflow/releases/<RELEASE_ID>/` заполнен
- [ ] symlink `/home/archflow/app` → releases/<RELEASE_ID>
- [ ] `.env.production` создан с правильными ключами
- [ ] `systemctl status archflow` → active (running)
- [ ] `curl http://127.0.0.1:3000` отдаёт HTML
- [ ] `nginx -t` → OK
- [ ] `curl -H 'Host: archflow.ru' http://<IP>` отдаёт HTML
- [ ] SSL сертификат получен (DNS или HTTP challenge)
