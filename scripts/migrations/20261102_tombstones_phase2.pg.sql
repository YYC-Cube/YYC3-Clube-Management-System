-- ============================================================================
-- 迭代补丁：member/room/staff/artist 投影表补墓碑列（与 04 §1 对齐；09 附录 A-2 同类修正）
-- 幂等可重复执行。执行：psql "$DATABASE_URL" -f scripts/migrations/20261102_tombstones_phase2.pg.sql
-- ============================================================================

BEGIN;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'operational_member', 'operational_member_level',
    'operational_room', 'operational_room_type',
    'operational_staff', 'operational_artist'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = t AND column_name = 'deleted'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN deleted BOOLEAN NOT NULL DEFAULT false', t);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN deleted_at TIMESTAMPTZ', t);
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%s_alive ON public.%I (tenant_id, store_id) WHERE deleted = false',
        t, t);
    END IF;
  END LOOP;
END $$;

COMMIT;
