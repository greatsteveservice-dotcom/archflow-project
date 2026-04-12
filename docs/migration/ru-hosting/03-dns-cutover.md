# 03 — Переключение DNS с Netlify на RU VPS

После `02-first-deploy.md` у тебя работающий фронт на российском IP. Пора
переключать трафик.

## Пред-проверки

Прежде чем трогать DNS:

```bash
# 1. Standalone сервер запущен
ssh archflow@<SERVER_IP> "sudo systemctl status archflow"
# → active (running)

# 2. nginx отвечает через HTTPS (если SSL уже получен)
curl -I https://archflow.ru --resolve archflow.ru:443:<SERVER_IP>
# → HTTP/2 200

# 3. SPA ассеты загружаются
curl https://archflow.ru/_next/static/chunks/... --resolve archflow.ru:443:<SERVER_IP>
# → JS content
```

Если хоть один пункт fails — **НЕ переключай DNS**. Фикси сначала.

## Шаг 1 — Cloudflare: отключить proxy на archflow.ru

1. Открой https://dash.cloudflare.com → archflow.ru → DNS → Records
2. У записей `A archflow.ru` (обе) и `CNAME www` → клик на оранжевую тучку → **серая тучка (DNS only)**
3. Подожди 60 сек — Cloudflare обновит кэш edge

## Шаг 2 — Cloudflare: поменять target A-записи

Удаляем старые Netlify записи и создаём одну новую:

1. Edit `A archflow.ru → 99.83.231.61` → удалить
2. Edit `A archflow.ru → 75.2.60.5` → удалить
3. Add record:
   - Type: A
   - Name: `archflow.ru` (или @)
   - IPv4: `<SERVER_IP>`
   - Proxy: **DNS only** (серая тучка)
   - TTL: Auto (2 мин)
   - Save

4. Edit `CNAME www → archflow-app.netlify.app`:
   - Content: `archflow.ru` (CNAME на корень — Cloudflare-flattening)
   - Proxy: **DNS only**
   - Save

## Шаг 3 — Ждать пропагации

```bash
# Локально:
dig +short archflow.ru A
# Должно вернуть <SERVER_IP>, не 99.83.231.61

# Может потребоваться 2-5 минут. Если всё ещё старый IP:
dig @1.1.1.1 +short archflow.ru A
dig @8.8.8.8 +short archflow.ru A
```

## Шаг 4 — Получить SSL если ещё не получен (HTTP challenge)

```bash
ssh archflow@<SERVER_IP>
sudo certbot --nginx -d archflow.ru -d www.archflow.ru \
  --non-interactive --agree-tos -m archflow.office@gmail.com \
  --redirect
```

certbot автоматически пропатчит `/etc/nginx/sites-available/archflow.conf`
с директивами ssl_certificate и добавит 80→443 redirect.

## Шаг 5 — Smoke test

С обычного браузера открой:
- https://archflow.ru → должен открыться Archflow
- https://archflow.ru/login → ok
- https://archflow.ru/projects → ok (после логина)
- В DevTools → Network → любой запрос → Remote Address должен быть `<SERVER_IP>:443`

Попроси Катю проверить **без VPN** → должно работать.

## Шаг 6 — Мониторинг

Первые 24 часа:
- `sudo journalctl -u archflow -f` — логи приложения
- `sudo tail -f /var/log/nginx/access.log` — nginx access
- `sudo tail -f /var/log/nginx/error.log` — nginx errors
- Yandex Metrika → смотри что трафик не упал

## Rollback

Если что-то сломалось:
1. В Cloudflare → вернуть обе A-записи на старые Netlify IPs:
   - `99.83.231.61` (proxied)
   - `75.2.60.5` (proxied)
2. CNAME `www` → `archflow-app.netlify.app` (proxied)
3. Включить оранжевую тучку
4. Wait 2-5 минут → сайт снова через Netlify

**Старый Netlify деплой НЕ удалён**, он просто перестал получать трафик.
Поэтому rollback безопасен.

## После успешного переключения

- Подожди неделю, убедись что всё стабильно
- Настрой health-check на VPS (cron job, который алертит в Telegram если `curl https://archflow.ru` возвращает не 200)
- Настрой автоматический renewal сертификата (certbot ставит systemd timer сам, проверь `systemctl list-timers | grep certbot`)
- Начинай подготовку Sprint 1 (Yandex Cloud staging) — VPS это временное решение
