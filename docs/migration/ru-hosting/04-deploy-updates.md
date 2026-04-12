# 04 — Continuous updates (выкатка новых версий)

После первого деплоя (`02-first-deploy.md`) последующие обновления делаются
одной командой.

## Быстро

Локально:
```bash
cd /Users/evgeny/Desktop/archflow-project
bash docs/migration/ru-hosting/scripts/deploy.sh <SERVER_IP>
```

Скрипт делает:
1. `npm ci` (если package-lock изменился)
2. `npm run build`
3. `build-release.sh` — собирает `/tmp/archflow-release/`
4. `rsync` на сервер → `releases/<timestamp>/`
5. копирует `.env.production` из текущего релиза в новый
6. переключает symlink `app → releases/<timestamp>`
7. `sudo systemctl restart archflow`
8. health check `curl https://archflow.ru` → 200
9. если health check fail → rollback symlink, restart, exit 1
10. держит только последние 5 релизов, старые удаляет

## Атомарность

Деплой атомарный благодаря symlink-стратегии:
- Новый релиз распаковывается в отдельную папку
- Старый сервис крутится без остановки
- symlink переключается одной операцией (`ln -sfn`)
- systemctl restart занимает 1-2 секунды
- Если health check не прошёл — symlink возвращается на предыдущий релиз

Downtime: ~2 секунды.

## Rollback

Если свежий деплой сломал прод:
```bash
ssh archflow@<SERVER_IP>
ls -t /home/archflow/releases/  # найди предыдущий релиз
ln -sfn /home/archflow/releases/<PREVIOUS> /home/archflow/app
sudo systemctl restart archflow
```

Или автоматически скрипт это делает если health check не прошёл.

## Структура релизов на сервере

```
/home/archflow/
├── app -> releases/20260411-180000
├── releases/
│   ├── 20260411-180000/   ← текущий
│   ├── 20260411-150000/   ← предыдущий
│   ├── 20260411-120000/
│   ├── 20260410-200000/
│   └── 20260410-150000/   ← 5-й, дальше удаляются
└── logs/
```

## Частота деплоев

- Prod: по мере необходимости, вручную командой выше
- Staging (если появится): автоматически по push в branch `staging`

## CI/CD (опционально)

Если появится желание автоматизировать — можно сделать GitHub Action:
```yaml
on: push: branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd nextjs-src && npm ci && npm run build
      - run: bash nextjs-src/scripts/build-release.sh
      - uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.RU_SERVER_IP }}
          username: archflow
          key: ${{ secrets.RU_SSH_KEY }}
          source: "/tmp/archflow-release/*"
          target: "/home/archflow/releases/${{ github.run_number }}/"
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.RU_SERVER_IP }}
          username: archflow
          key: ${{ secrets.RU_SSH_KEY }}
          script: |
            ln -sfn /home/archflow/releases/${{ github.run_number }} /home/archflow/app
            sudo systemctl restart archflow
```

Но это уже не для первого раза.
