# Как запустить проект Circle

Пошаговая инструкция для тех, кто раньше этого не делал. Следуйте по порядку.

## 1. Установите Node.js

Скачайте и установите с https://nodejs.org (версия LTS). Это нужно, чтобы
запускать JavaScript-проекты на компьютере.

Проверьте установку в терминале:
```
node -v
```

## 2. Создайте проект в Supabase

Supabase — это бесплатный сервис, который даёт готовую базу данных и
авторизацию, чтобы не писать это с нуля.

1. Зайдите на https://supabase.com и зарегистрируйтесь
2. Нажмите **New Project**
3. Придумайте имя проекта и пароль для базы данных (сохраните его)
4. Дождитесь создания проекта (около 2 минут)

## 3. Создайте таблицу profiles

В панели Supabase откройте **SQL Editor** (в левом меню) и выполните этот
запрос — он создаёт таблицу для профилей и настраивает права доступа:

```sql
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text,
  bio text,
  favorite_genres text,
  created_at timestamp with time zone default now()
);

alter table profiles enable row level security;

create policy "Пользователи видят все профили"
  on profiles for select
  using (true);

create policy "Пользователи редактируют только свой профиль"
  on profiles for update
  using (auth.uid() = id);

create policy "Пользователи создают свой профиль при регистрации"
  on profiles for insert
  with check (auth.uid() = id);
```

## 4. Получите ключи доступа

В панели Supabase: **Project Settings** → **API**. Там будут два значения:
- **Project URL**
- **anon public key**

## 5. Настройте проект локально

В папке проекта:

1. Скопируйте файл `.env.local.example` в новый файл `.env.local`
2. Вставьте туда значения из шага 4:

```
NEXT_PUBLIC_SUPABASE_URL=вставьте сюда Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=вставьте сюда anon public key
```

## 6. Установите зависимости и запустите

В терминале, находясь в папке проекта:

```
npm install
npm run dev
```

Откройте в браузере http://localhost:3000 — сайт должен заработать.
Попробуйте зарегистрироваться — новый пользователь появится в Supabase
в разделе **Authentication** → **Users**, а его профиль — в таблице
**profiles** (раздел **Table Editor**).

## Что дальше

Это фундамент: регистрация, вход, профиль. Следующие логичные шаги:
- Чат между пользователями в реальном времени
- Форум по тайтлам
- Списки просмотренных аниме

Возвращайтесь, когда будете готовы развивать проект дальше — опишите,
что добавить, и продолжим оттуда же.
