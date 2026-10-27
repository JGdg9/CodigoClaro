-- Registra los aciertos anteriores para no volver a conceder XP por las mismas preguntas.
BEGIN;
CREATE TABLE IF NOT EXISTS quiz_question_rewards (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, question_id)
);
-- Conserva como acreditados los aciertos históricos sin modificar el XP ya almacenado.
INSERT INTO quiz_question_rewards (user_id, question_id, created_at)
SELECT qa.user_id, answer.value->>'id', MIN(qa.created_at)
FROM quiz_attempts AS qa
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(qa.answers) = 'array' THEN qa.answers ELSE '[]'::jsonb END
) AS answer(value)
WHERE answer.value->>'correct' = 'true'
  AND NULLIF(answer.value->>'id', '') IS NOT NULL
GROUP BY qa.user_id, answer.value->>'id'
ON CONFLICT (user_id, question_id) DO NOTHING;
INSERT INTO schema_migrations(version) VALUES ('002_postgres_question_rewards') ON CONFLICT DO NOTHING;
COMMIT;
