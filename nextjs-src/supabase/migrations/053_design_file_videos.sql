-- Видеообзоры файлов (Loom-style screen+camera recording)
-- Дизайнер записывает экран + камеру для пояснения чертежа/визуализации,
-- заказчик смотрит видео рядом с файлом.
--
-- Хранение: Yandex Object Storage (бакет archflow-media-prod), путь
-- projects/{project_id}/videos/{video_id}.webm
-- В БД храним только метаданные + транскрипт (для поиска и доступности).

CREATE TABLE IF NOT EXISTS design_file_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES design_files(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  s3_key text NOT NULL,                  -- путь в бакете
  s3_bucket text NOT NULL DEFAULT 'archflow-media-prod',
  duration_sec integer,
  size_bytes bigint,
  mime_type text DEFAULT 'video/webm',
  transcript text,                       -- расшифровка через Whisper / GPT-4o-mini
  transcript_status text DEFAULT 'pending' CHECK (transcript_status IN ('pending', 'processing', 'done', 'failed')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dfv_file ON design_file_videos(file_id);
CREATE INDEX IF NOT EXISTS idx_dfv_project ON design_file_videos(project_id);

-- RLS: видеообзор виден всем участникам проекта (как и сами файлы)
ALTER TABLE design_file_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view videos"
  ON design_file_videos FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
    OR project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Только владелец проекта или ассистенты-дизайнеры могут создавать видео
-- (заказчик/подрядчик/поставщик видео не записывают)
CREATE POLICY "Designers can insert videos"
  ON design_file_videos FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = design_file_videos.project_id
        AND user_id = auth.uid()
        AND role IN ('designer', 'assistant')
    )
  );

CREATE POLICY "Authors can delete their videos"
  ON design_file_videos FOR DELETE
  USING (created_by = auth.uid());
