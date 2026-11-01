-- ============================================================================
-- 迭代补丁：staff/artist 投影表补齐（07 W2.6/W2.7；room 已在 20261102_sync_nonce_member_room）
-- 依据：04 §3 员工 / §8 艺人核心字段；幂等可重复执行
-- 执行：psql "$DATABASE_URL" -f scripts/migrations/20261102_staff_artist.pg.sql
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.operational_staff (
  id                VARCHAR(64) PRIMARY KEY,
  tenant_id         VARCHAR(36) NOT NULL,
  store_id          VARCHAR(36) NOT NULL,
  user_id           VARCHAR(64),
  name              VARCHAR(96) NOT NULL,
  group_id          VARCHAR(64),
  role              VARCHAR(32),
  quota_cents       BIGINT,
  status            VARCHAR(16) NOT NULL DEFAULT 'active',
  record_version    BIGINT      NOT NULL,
  source_event_id   VARCHAR(64),
  source_command_id VARCHAR(64),
  payload           JSONB       NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_op_staff_status CHECK (status IN ('active', 'inactive', 'left'))
);

CREATE INDEX IF NOT EXISTS idx_op_staff_store ON public.operational_staff (tenant_id, store_id, status);
COMMENT ON TABLE public.operational_staff IS '员工门店档案投影（master.staff.*）：不含密码/登录凭据（04 §3）';

DROP TRIGGER IF EXISTS trg_op_staff_updated_at ON public.operational_staff;
CREATE TRIGGER trg_op_staff_updated_at BEFORE UPDATE ON public.operational_staff
FOR EACH ROW EXECUTE FUNCTION public.yyc3_set_updated_at();

CREATE TABLE IF NOT EXISTS public.operational_artist (
  id                VARCHAR(64) PRIMARY KEY,
  tenant_id         VARCHAR(36) NOT NULL,
  store_id          VARCHAR(36) NOT NULL,
  artist_no         VARCHAR(32),
  name              VARCHAR(96) NOT NULL,
  group_id          VARCHAR(64),
  level_id          VARCHAR(64),
  badge_no          VARCHAR(32),
  stage_fee_rule    JSONB,
  status            VARCHAR(16) NOT NULL DEFAULT 'active',
  record_version    BIGINT      NOT NULL,
  source_event_id   VARCHAR(64),
  source_command_id VARCHAR(64),
  payload           JSONB       NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_op_artist_status CHECK (status IN ('active', 'left'))
);

CREATE INDEX IF NOT EXISTS idx_op_artist_store ON public.operational_artist (tenant_id, store_id, status);
COMMENT ON TABLE public.operational_artist IS '艺人档案投影（master.artist.*）：App 写、CMS 投影（10 号规范 v1.3.0 裁定）';

DROP TRIGGER IF EXISTS trg_op_artist_updated_at ON public.operational_artist;
CREATE TRIGGER trg_op_artist_updated_at BEFORE UPDATE ON public.operational_artist
FOR EACH ROW EXECUTE FUNCTION public.yyc3_set_updated_at();

COMMIT;
