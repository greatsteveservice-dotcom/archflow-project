-- Restrict chat message deletion to 24 hours after sending.
-- Previously users could delete their own messages at any time, which is
-- inappropriate for audit/trust. This enforces the 24h window at the DB level.

DROP POLICY IF EXISTS "chat_msg_delete" ON chat_messages;

CREATE POLICY "chat_msg_delete" ON chat_messages FOR DELETE
  USING (
    user_id = auth.uid()
    AND created_at > (now() - interval '24 hours')
  );
