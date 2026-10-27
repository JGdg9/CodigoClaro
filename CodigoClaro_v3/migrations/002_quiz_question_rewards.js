'use strict';

module.exports = {
  id: '002_quiz_question_rewards',
  up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS quiz_question_rewards(
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(user_id, question_id)
    )`);

    // Carga los aciertos anteriores para que una pregunta histórica no vuelva a conceder XP.
    const insertReward = db.prepare('INSERT OR IGNORE INTO quiz_question_rewards(user_id,question_id,created_at) VALUES(?,?,?)');
    for (const attempt of db.prepare('SELECT user_id,created_at,answers_json FROM quiz_attempts').iterate()) {
      let answers;
      try { answers = JSON.parse(attempt.answers_json); } catch { answers = []; }
      if (!Array.isArray(answers)) continue;
      for (const answer of answers) {
        if (answer?.correct === true && typeof answer.id === 'string' && answer.id.length > 0) {
          insertReward.run(attempt.user_id, answer.id, attempt.created_at);
        }
      }
    }
  }
};
