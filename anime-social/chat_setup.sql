-- ===== ОБЩИЙ ЧАТ =====

create table global_messages (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  username text not null,
  content text not null,
  created_at timestamptz default now()
);

alter table global_messages enable row level security;

create policy "Все видят общий чат"
  on global_messages for select
  using (true);

create policy "Авторизованные пользователи пишут в общий чат"
  on global_messages for insert
  with check (auth.uid() = user_id);

-- ===== ЛИЧНЫЕ СООБЩЕНИЯ =====

create table conversations (
  id bigint generated always as identity primary key,
  user_one uuid references auth.users on delete cascade not null,
  user_two uuid references auth.users on delete cascade not null,
  created_at timestamptz default now(),
  unique (user_one, user_two)
);

alter table conversations enable row level security;

create policy "Участники видят свои переписки"
  on conversations for select
  using (auth.uid() = user_one or auth.uid() = user_two);

create policy "Пользователи создают переписки с собой в участниках"
  on conversations for insert
  with check (auth.uid() = user_one or auth.uid() = user_two);

create table direct_messages (
  id bigint generated always as identity primary key,
  conversation_id bigint references conversations on delete cascade not null,
  sender_id uuid references auth.users on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

alter table direct_messages enable row level security;

create policy "Участники переписки видят сообщения"
  on direct_messages for select
  using (
    exists (
      select 1 from conversations
      where conversations.id = direct_messages.conversation_id
      and (conversations.user_one = auth.uid() or conversations.user_two = auth.uid())
    )
  );

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

-- ===== ВКЛЮЧАЕМ REALTIME (мгновенные обновления) =====

alter publication supabase_realtime add table global_messages;
alter publication supabase_realtime add table direct_messages;
