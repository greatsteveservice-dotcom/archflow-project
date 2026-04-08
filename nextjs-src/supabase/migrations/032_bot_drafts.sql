-- Bot drafts for voice transcription bot
-- Temporary storage for transcripts between voice → recipient selection → formatting

create table if not exists bot_drafts (
  id             uuid primary key default gen_random_uuid(),
  chat_id        bigint not null,
  transcript     text,
  result         text,
  tone           text,
  awaiting_edit  boolean default false,
  created_at     timestamptz default now()
);

-- Index for cleanup of old drafts (auto-delete after 24h via cron or manual)
create index idx_bot_drafts_created_at on bot_drafts(created_at);
