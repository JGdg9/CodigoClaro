'use strict';

module.exports = {
  id: '001_initial_schema',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS learning_topics(id INTEGER PRIMARY KEY AUTOINCREMENT,slug TEXT NOT NULL UNIQUE,name TEXT NOT NULL UNIQUE,description TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS learning_questions(id TEXT PRIMARY KEY,topic_id INTEGER NOT NULL REFERENCES learning_topics(id) ON DELETE CASCADE,prompt TEXT NOT NULL,options_json TEXT NOT NULL,correct_index INTEGER NOT NULL,explanation TEXT NOT NULL,difficulty TEXT NOT NULL CHECK(difficulty IN ('basic','intermediate','advanced')),active INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE INDEX IF NOT EXISTS idx_learning_questions_topic ON learning_questions(topic_id,active,difficulty);
      CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,email TEXT NOT NULL UNIQUE,display_name TEXT NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('student','admin')),consent_at TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,last_login_at TEXT);
      CREATE TABLE IF NOT EXISTS progress(user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,xp INTEGER NOT NULL DEFAULT 0,completed_json TEXT NOT NULL DEFAULT '[]',attempts_json TEXT NOT NULL DEFAULT '[]',planner_json TEXT NOT NULL DEFAULT '[]',snippets_json TEXT NOT NULL DEFAULT '[]',updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS activity(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,event_type TEXT NOT NULL,detail_json TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS spaced_reviews(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,topic TEXT NOT NULL,interval_days INTEGER NOT NULL DEFAULT 1,repetitions INTEGER NOT NULL DEFAULT 0,last_pct INTEGER NOT NULL DEFAULT 0,last_reviewed TEXT NOT NULL,due_at TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(user_id,topic));
      CREATE TABLE IF NOT EXISTS quiz_attempts(id TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,topic TEXT NOT NULL,mode TEXT NOT NULL CHECK(mode IN ('practice','exam')),score INTEGER NOT NULL,total INTEGER NOT NULL,pct INTEGER NOT NULL,xp_awarded INTEGER NOT NULL,answers_json TEXT NOT NULL,topic_stats_json TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS weekly_goals(user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,tests_target INTEGER NOT NULL DEFAULT 5 CHECK(tests_target BETWEEN 1 AND 100),minutes_target INTEGER NOT NULL DEFAULT 120 CHECK(minutes_target BETWEEN 1 AND 10000),week_start TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS study_sessions(id TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,topic TEXT NOT NULL DEFAULT '',started_at TEXT NOT NULL,ended_at TEXT,duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK(duration_seconds BETWEEN 0 AND 86400),note TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE INDEX IF NOT EXISTS idx_study_sessions_user_started ON study_sessions(user_id,started_at DESC);
      CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_created ON quiz_attempts(user_id,created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_spaced_reviews_due ON spaced_reviews(user_id,due_at);
      CREATE TABLE IF NOT EXISTS feedback(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,kind TEXT NOT NULL,rating INTEGER,message TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewing','resolved')),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,resolved_at TEXT);
      CREATE TABLE IF NOT EXISTS sessions(sid TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE INDEX IF NOT EXISTS idx_activity_user_created ON activity(user_id,created_at);
      CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status,created_at);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires);
    `);
  }
};

