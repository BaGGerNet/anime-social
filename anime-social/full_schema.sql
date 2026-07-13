-- ============================================================
-- ПОЛНАЯ СХЕМА БАЗЫ ДАННЫХ ПРОЕКТА CIRCLE
-- Актуальный список всех команд, которые мы выполняли.
-- Можно использовать как справочник или для настройки
-- нового Supabase-проекта с нуля.
-- ============================================================


-- ===== 1. ПРОФИЛИ =====

create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  username text,
  bio text,
  favorite_genres text,
  created_at timestamp with time zone default now()
);

alter table profiles enable row level security;

drop policy if exists "Пользователи видят все профили" on profiles;
create policy "Пользователи видят все профили"
  on profiles for select
  using (true);

drop policy if exists "Пользователи редактируют только свой профиль" on profiles;
create policy "Пользователи редактируют только свой профиль"
  on profiles for update
  using (auth.uid() = id);

-- Эта политика больше не нужна — профиль теперь создаётся
-- автоматически через триггер (см. раздел 2 ниже), но
-- удаляем на случай, если она осталась с первой попытки
drop policy if exists "Пользователи создают свой профиль при регистрации" on profiles;


-- ===== 2. АВТОСОЗДАНИЕ ПРОФИЛЯ ПРИ РЕГИСТРАЦИИ =====

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ===== 3. ОБЩИЙ ЧАТ =====

create table if not exists global_messages (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  username text not null,
  content text not null,
  created_at timestamptz default now()
);

alter table global_messages enable row level security;

drop policy if exists "Все видят общий чат" on global_messages;
create policy "Все видят общий чат"
  on global_messages for select
  using (true);

drop policy if exists "Авторизованные пользователи пишут в общий чат" on global_messages;
create policy "Авторизованные пользователи пишут в общий чат"
  on global_messages for insert
  with check (auth.uid() = user_id);


-- ===== 4. ЛИЧНЫЕ СООБЩЕНИЯ =====

create table if not exists conversations (
  id bigint generated always as identity primary key,
  user_one uuid references auth.users on delete cascade not null,
  user_two uuid references auth.users on delete cascade not null,
  created_at timestamptz default now(),
  unique (user_one, user_two)
);

alter table conversations enable row level security;

drop policy if exists "Участники видят свои переписки" on conversations;
create policy "Участники видят свои переписки"
  on conversations for select
  using (auth.uid() = user_one or auth.uid() = user_two);

drop policy if exists "Пользователи создают переписки с собой в участниках" on conversations;
create policy "Пользователи создают переписки с собой в участниках"
  on conversations for insert
  with check (auth.uid() = user_one or auth.uid() = user_two);

create table if not exists direct_messages (
  id bigint generated always as identity primary key,
  conversation_id bigint references conversations on delete cascade not null,
  sender_id uuid references auth.users on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

alter table direct_messages enable row level security;

drop policy if exists "Участники переписки видят сообщения" on direct_messages;
create policy "Участники переписки видят сообщения"
  on direct_messages for select
  using (
    exists (
      select 1 from conversations
      where conversations.id = direct_messages.conversation_id
      and (conversations.user_one = auth.uid() or conversations.user_two = auth.uid())
    )
  );

drop policy if exists "Участники переписки пишут сообщения" on direct_messages;
create policy "Участники переписки пишут сообщения"
  on direct_messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from conversations
      where conversations.id = direct_messages.conversation_id
      and (conversations.user_one = auth.uid() or conversations.user_two = auth.uid())
    )
  );


-- ===== 5. REALTIME (мгновенные обновления чата) =====
-- Если эти команды выдают ошибку "already exists" — это нормально,
-- значит realtime для таблицы уже был включён ранее.

alter publication supabase_realtime add table global_messages;
alter publication supabase_realtime add table direct_messages;
