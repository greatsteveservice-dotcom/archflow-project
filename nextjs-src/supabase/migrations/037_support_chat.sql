-- Support chat: two-way messaging between users and support (via Telegram)

-- Threads: one thread per user
create table support_threads (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade unique,
  user_name       text,
  user_email      text,
  telegram_chat_id bigint,
  last_message    text,
  last_message_at timestamptz,
  has_unread      boolean default false,
  created_at      timestamptz default now()
);

create index on support_threads(user_id);

alter table support_threads enable row level security;

create policy "user sees own thread" on support_threads
  for select using (user_id = auth.uid());

create policy "user updates own thread" on support_threads
  for update using (user_id = auth.uid());

-- Messages
create table support_messages (
  id              uuid primary key default gen_random_uuid(),
  thread_id       uuid not null references support_threads(id) on delete cascade,
  user_id         uuid references auth.users(id) on delete set null,
  sender          text not null check (sender in ('user', 'support')),
  body            text not null,
  telegram_msg_id integer,
  created_at      timestamptz default now(),
  seen_at         timestamptz
);

create index on support_messages(thread_id);
create index on support_messages(user_id);

alter table support_messages enable row level security;

-- User can read messages from their own thread
create policy "user reads own thread messages" on support_messages
  for select using (
    thread_id in (select id from support_threads where user_id = auth.uid())
  );

-- User can insert their own messages
create policy "user inserts own messages" on support_messages
  for insert with check (user_id = auth.uid() and sender = 'user');

-- Enable realtime for support_messages
alter publication supabase_realtime add table support_messages;
