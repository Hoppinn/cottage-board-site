-- 포인트 승인 대기 테이블
-- 업적 달성 시 point_rewards(pending) 생성 → 관리자 승인 → points_log 기록

CREATE TABLE IF NOT EXISTS point_rewards (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  achievement_id TEXT REFERENCES achievements(id),
  points INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT
);
