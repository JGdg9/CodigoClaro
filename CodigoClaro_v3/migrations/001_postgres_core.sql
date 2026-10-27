-- CódigoClaro PostgreSQL schema v1. Safe to apply repeatedly.
BEGIN;
-- Historial de migraciones aplicadas: permite identificar qué versión del esquema se instaló.
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Cuentas de usuario. Nunca almacenar contraseñas en texto plano; password_hash contiene solo el hash.
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','admin')),
  consent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);
-- Sesiones autenticadas asociadas a una cuenta y con fecha de expiración.
CREATE TABLE IF NOT EXISTS sessions (
  sid TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at);
-- Catálogo de cursos visibles y sus metadatos editoriales.
CREATE TABLE IF NOT EXISTS courses (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  technology TEXT NOT NULL DEFAULT 'General',
  level TEXT NOT NULL DEFAULT 'beginner' CHECK(level IN ('beginner','intermediate','advanced')),
  published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Lecciones ordenadas dentro de cada curso; borrar un curso elimina sus lecciones.
CREATE TABLE IF NOT EXISTS course_lessons (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  UNIQUE(course_id, slug), UNIQUE(course_id, position)
);
-- Banco de preguntas con opciones JSON y restricciones sobre índice de respuesta y dificultad.
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  course_id BIGINT REFERENCES courses(id) ON DELETE SET NULL,
  topic TEXT NOT NULL,
  prompt TEXT NOT NULL,
  options JSONB NOT NULL CHECK(jsonb_typeof(options)='array' AND jsonb_array_length(options)>=2),
  correct_index INTEGER NOT NULL CHECK(correct_index>=0 AND correct_index < jsonb_array_length(options)),
  explanation TEXT NOT NULL DEFAULT '',
  difficulty TEXT NOT NULL DEFAULT 'basic' CHECK(difficulty IN ('basic','intermediate','advanced')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS questions_topic_active_idx ON questions(topic, active, difficulty);
-- Historial de intentos y resultados de cuestionarios por usuario.
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL DEFAULT 'all',
  mode TEXT NOT NULL DEFAULT 'practice' CHECK(mode IN ('practice','exam')),
  score INTEGER NOT NULL CHECK(score>=0),
  total INTEGER NOT NULL CHECK(total>0),
  pct INTEGER NOT NULL CHECK(pct BETWEEN 0 AND 100),
  xp_awarded INTEGER NOT NULL DEFAULT 0 CHECK(xp_awarded>=0),
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS quiz_attempts_user_created_idx ON quiz_attempts(user_id, created_at DESC);
-- Estado de avance de cada usuario en cada lección.
CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_key TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  last_position INTEGER NOT NULL DEFAULT 0 CHECK(last_position>=0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(user_id, lesson_key)
);
-- Tareas personales del alumno, aisladas por user_id.
CREATE TABLE IF NOT EXISTS study_tasks (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 180),
  notes TEXT NOT NULL DEFAULT '',
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS study_tasks_user_created_idx ON study_tasks(user_id, completed_at, created_at DESC);
-- Sesiones de estudio y duración para calcular estadísticas personales.
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL DEFAULT '',
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK(duration_seconds BETWEEN 0 AND 86400),
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS study_sessions_user_started_idx ON study_sessions(user_id, started_at DESC);
INSERT INTO schema_migrations(version) VALUES ('001_postgres_core') ON CONFLICT DO NOTHING;
COMMIT;
