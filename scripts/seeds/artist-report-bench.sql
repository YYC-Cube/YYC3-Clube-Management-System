-- ============================================================================
-- 艺人报表压测种子数据（PostgreSQL 13+）
-- 用途：验证 1 万级上下钟 + 5000 条扣款下，4 个报表接口与导出的性能
-- 执行：psql "$DATABASE_URL" -f scripts/seeds/artist-report-bench.sql
-- 说明：脚本幂等（固定 id + ON CONFLICT DO NOTHING），可重复执行
-- ============================================================================

BEGIN;

-- 3 位压测艺人
INSERT INTO artist (id, artist_no, name, level, store_id, phone, status, joined_at)
VALUES
  ('bench-artist-1', 'BENCH-A-001', '压测艺人甲', '首席', 'bench-store', '13900000001', 'active', '2025-01-01'),
  ('bench-artist-2', 'BENCH-A-002', '压测艺人乙', '金牌', 'bench-store', '13900000002', 'active', '2025-01-01'),
  ('bench-artist-3', 'BENCH-A-003', '压测艺人丙', '银牌', 'bench-store', '13900000003', 'active', '2025-01-01')
ON CONFLICT (id) DO NOTHING;

-- 10000 条上下钟（2026-10-01 ~ 2026-10-31，约每 7 条有 1 条服务中）
INSERT INTO artist_clock_record
  (id, record_no, artist_id, store_id, room_no, guest_name,
   clock_in_at, clock_out_at, duration_minutes, stage_fee, status, operator_id)
SELECT
  'bench-clock-' || g,
  'BENCH-C-' || g,
  'bench-artist-' || (((g - 1) % 3) + 1),
  'bench-store',
  'B' || ((g % 50) + 1),
  '压测客人' || g,
  t.clock_in,
  CASE WHEN g % 7 = 0 THEN NULL ELSE t.clock_in + interval '90 minutes' END,
  CASE WHEN g % 7 = 0 THEN 0 ELSE 90 END,
  600,
  CASE WHEN g % 7 = 0 THEN 'serving' WHEN g % 5 = 0 THEN 'unsettled' ELSE 'settled' END,
  'bench-op'
FROM generate_series(1, 10000) AS g
CROSS JOIN LATERAL (
  SELECT timestamptz '2026-10-01 00:00:00+08'
       + ((g - 1) % 31) * interval '1 day'
       + ((g - 1) % 12) * interval '1 hour' AS clock_in
) AS t
ON CONFLICT (id) DO NOTHING;

-- 5000 条扣款（10% 已撤销），关联前 5000 条上下钟
INSERT INTO artist_fee_deduction
  (id, deduction_no, clock_record_id, artist_id, type, amount, reason, status,
   operator_id, approved_by, approved_at, revoked_at, created_at)
SELECT
  'bench-ded-' || g,
  'BENCH-D-' || g,
  'bench-clock-' || g,
  'bench-artist-' || (((g - 1) % 3) + 1),
  'late',
  50,
  '压测扣款' || g,
  CASE WHEN g % 10 = 0 THEN 'revoked' ELSE 'confirmed' END,
  'bench-op',
  CASE WHEN g % 10 = 0 THEN NULL ELSE 'bench-mgr' END,
  CASE WHEN g % 10 = 0 THEN NULL ELSE t.created_at END,
  CASE WHEN g % 10 = 0 THEN t.created_at ELSE NULL END,
  t.created_at
FROM generate_series(1, 5000) AS g
CROSS JOIN LATERAL (
  SELECT timestamptz '2026-10-01 00:00:00+08'
       + ((g - 1) % 31) * interval '1 day'
       + ((g - 1) % 12) * interval '1 hour'
       + interval '95 minutes' AS created_at
) AS t
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- 验证：应输出 10000 / 5000
SELECT
  (SELECT COUNT(*) FROM artist_clock_record WHERE store_id = 'bench-store') AS clock_rows,
  (SELECT COUNT(*) FROM artist_fee_deduction WHERE artist_id IN ('bench-artist-1', 'bench-artist-2', 'bench-artist-3')) AS deduction_rows;
