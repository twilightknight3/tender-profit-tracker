# Tender Profit Tracker

Персональная панель учёта тендеров: прибыль, расходы, статусы оплаты, поиск, фильтры и годовая аналитика.

## Технологии
- Static frontend: HTML, CSS, JavaScript
- Hosting: GitHub Pages
- Auth + PostgreSQL: Supabase
- Charts: Chart.js

## 1. Подготовить Supabase
1. Создайте проект в [Supabase](https://supabase.com/dashboard).
2. В SQL Editor выполните файл `supabase/schema.sql`.
3. В Authentication → Providers включите Email.
4. В Authentication → Users добавьте свой аккаунт (Invite user / Create user).
5. Для личного приложения отключите публичную регистрацию в Authentication → Settings / Signups.
6. Скопируйте Project URL и Publishable key (или legacy anon key) из Project Settings → API.

## 2. Подключить сайт
Откройте `js/config.js` и замените:
- `https://YOUR_PROJECT_ID.supabase.co` на Project URL;
- `YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY` на публичный Publishable/anon key.

Никогда не добавляйте service_role или secret key в frontend или GitHub.

## 3. Опубликовать через GitHub Pages
1. Откройте репозиторий Settings → Pages.
2. В разделе Build and deployment выберите Deploy from a branch.
3. Branch: `main`, folder: `/ (root)`, затем Save.
4. Через несколько минут сайт будет доступен по адресу:
   https://twilightknight3.github.io/tender-profit-tracker/

## 4. Первый вход
Войдите по email и паролю пользователя, которого создали в Supabase Auth. Регистрация через интерфейс сайта намеренно отсутствует.

## Функции
- Создание, редактирование и удаление тендеров
- Автоматический расчёт прибыли: сумма лота − налог − себестоимость − дополнительные расходы
- Поиск, фильтры по платформе, оплате и дате
- Главная панель, годовая статистика и графики
- Экспорт CSV
- Облачное хранение и синхронизация после обновления данных

## Безопасность
Таблица защищена Row Level Security (RLS): пользователь получает доступ только к строкам, где owner_id равен его auth.uid(). Так как репозиторий публичный, исходный код и файл конфигурации видны всем; в конфигурации допустим только публичный anon/publishable key при включённом RLS.
