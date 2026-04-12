# 01 — Начальная настройка VPS

Выполняется ОДИН РАЗ после создания VPS. Все команды запускаются по SSH.

## Предполагаем

- У тебя свежий Ubuntu 22.04 VPS
- IP: `<SERVER_IP>` (подставь свой)
- SSH-ключ загружен, подключаешься как `root`

## Пошагово

### 1. Первый вход и обновление

```bash
ssh root@<SERVER_IP>
apt update && apt upgrade -y
apt install -y curl git vim ufw fail2ban htop unzip
```

### 2. Создание deploy-пользователя

Работать под root — плохая практика. Создаём `archflow` user с sudo.

```bash
adduser --disabled-password --gecos "" archflow
usermod -aG sudo archflow
mkdir -p /home/archflow/.ssh
cp /root/.ssh/authorized_keys /home/archflow/.ssh/authorized_keys
chown -R archflow:archflow /home/archflow/.ssh
chmod 700 /home/archflow/.ssh
chmod 600 /home/archflow/.ssh/authorized_keys

# Разрешаем sudo без пароля (чтобы CI/CD мог systemctl restart)
echo "archflow ALL=(ALL) NOPASSWD: /bin/systemctl, /usr/bin/systemctl" > /etc/sudoers.d/archflow
chmod 440 /etc/sudoers.d/archflow
```

Проверь с другого терминала:
```bash
ssh archflow@<SERVER_IP>
sudo systemctl status  # должно работать без пароля
```

### 3. Firewall

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status
```

### 4. SSH hardening (опционально, но рекомендуется)

```bash
# Отключить root login и пароли
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh
```

### 5. Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs
node -v   # v20.x.x
npm -v
```

### 6. nginx

```bash
apt install -y nginx
systemctl enable nginx
systemctl start nginx
```

Проверь что nginx отвечает: `curl http://<SERVER_IP>` → Welcome page.

### 7. Let's Encrypt / certbot

```bash
apt install -y certbot python3-certbot-nginx
```

Сертификат будем получать после того как DNS будет указывать на этот IP (шаг 03).

### 8. Создание директорий приложения

```bash
sudo -u archflow mkdir -p /home/archflow/app
sudo -u archflow mkdir -p /home/archflow/releases
sudo -u archflow mkdir -p /home/archflow/logs
```

Структура:
```
/home/archflow/
├── app/            ← symlink → releases/<timestamp>/
├── releases/
│   └── 20260411-180000/   ← каждый деплой = новая папка
└── logs/
```

### 9. Установка pm2 (альтернатива systemd — выбери одно)

Мы будем использовать **systemd** (проще, нет лишних зависимостей).
Если передумаешь — pm2 ставится так:
```bash
sudo npm install -g pm2
```

### 10. Готово

VPS настроен. Переходи к `02-first-deploy.md`.

## Чеклист

- [ ] `ssh archflow@<IP>` работает без пароля
- [ ] `sudo systemctl status` работает без пароля
- [ ] `node -v` → 20.x
- [ ] `nginx -v` → nginx/1.x
- [ ] `certbot --version` работает
- [ ] `ufw status` → active, разрешены 22/80/443
- [ ] `curl http://<IP>` → Welcome to nginx
- [ ] `/home/archflow/{app,releases,logs}` существуют
