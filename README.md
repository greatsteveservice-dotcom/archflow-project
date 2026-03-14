# Archflow — Architecture Workflow Platform

## Файлы проекта

### Готовый HTML (для шаринга)
- **index.html** — полноценное демо, открывается в браузере. Для публикации залить на Netlify Drop.

### React-артефакты (для Claude / разработки)
- **01-designer-full.jsx** — Полный интерфейс дизайнера: логин, проекты, Journal (счета), Визиты (планирование), Supply (полный модуль с Timeline, спецификацией, импортом), Документы, Настройки (роли + детали)
- **02-client-portal.jsx** — Портал заказчика: обзор, визиты, счета к оплате, комплектация с графиком платежей, документы
- **03-supply-module.jsx** — Модуль комплектации отдельно: Dashboard, Спецификация, Procurement Timeline (Gantt), Этапы стройки (Блок/ГКЛ), Импорт Excel, Настройки

### Next.js исходники
- **nextjs-src/** — файлы для интеграции в Next.js + Tailwind проект

## Demo credentials
- Дизайнер: demo@archflow.app / demo12345
- Заказчик: client@archflow.app / client123

## Публикация на Netlify
1. Создайте папку, положите index.html
2. Откройте app.netlify.com/drop
3. Перетащите папку
4. Получите публичную ссылку
5. Пароль Netlify: My-Drop-Site (для незарегистрированных)
