-- ============================================================================
-- 迭代补丁：sync_nonce 防重放表（协同规范 09 附录 A-3-3 兑现）+ member/room 投影表
-- 依据：01 §安全（服务间重放防护）；07 W2.4/W2.5（房型/会员投影，此前批次未含）
-- 幂等：可重复执行
-- 执行：psql "$DATABASE_URL" -f scripts/migrations/20261102_sync_nonce_member_room.pg.sql
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. sync_nonce：HMAC nonce 防重放（多实例安全；实例内缓存仅剩 mock 方言使用）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sync_nonce (
  nonce      VARCHAR(128) PRIMARY KEY,
  expires_at TIMESTAMPTZ  NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_nonce_expiry ON public.sync_nonce (expires_at);

COMMENT ON TABLE public.sync_nonce IS 'HMAC nonce 防重放登记（01 §安全）：冲突即重放；过期行由查询时顺带清理';

-- ----------------------------------------------------------------------------
-- 2. operational_member / operational_member_level（07 W2.5；04 §7 会员主档）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.operational_member (
  id                VARCHAR(64) PRIMARY KEY,
  tenant_id         VARCHAR(36) NOT NULL,
  store_id          VARCHAR(36) NOT NULL,
  card_no           VARCHAR(48),
  name              VARCHAR(96),
  phone_masked      VARCHAR(32),
  level_id          VARCHAR(64),
  balance_cents     BIGINT      NOT NULL DEFAULT 0,
  points            INTEGER     NOT NULL DEFAULT 0,
  status            VARCHAR(16) NOT NULL DEFAULT 'active',
  record_version    BIGINT      NOT NULL,
  source_event_id   VARCHAR(64),
  source_command_id VARCHAR(64),
  payload           JSONB       NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_member_card UNIQUE (tenant_id, store_id, card_no),
  CONSTRAINT ck_member_status CHECK (status IN ('active', 'inactive', 'banned'))
);

CREATE INDEX IF NOT EXISTS idx_op_member_store ON public.operational_member (tenant_id, store_id, status);
COMMENT ON TABLE public.operational_member IS '会员主档投影（master.member.*）：手机号脱敏存储（04 §11 PII）';

DROP TRIGGER IF EXISTS trg_op_member_updated_at ON public.operational_member;
CREATE TRIGGER trg_op_member_updated_at BEFORE UPDATE ON public.operational_member
FOR EACH ROW EXECUTE FUNCTION public.yyc3_set_updated_at();

CREATE TABLE IF NOT EXISTS public.operational_member_level (
  id                VARCHAR(64) PRIMARY KEY,
  tenant_id         VARCHAR(36) NOT NULL,
  store_id          VARCHAR(36) NOT NULL,
  name              VARCHAR(96) NOT NULL,
  discount_percent  NUMERIC(5,2),
  sort_order        INTEGER     NOT NULL DEFAULT 0,
  status            VARCHAR(16) NOT NULL DEFAULT 'active',
  record_version    BIGINT      NOT NULL,
  source_event_id   VARCHAR(64),
  payload           JSONB       NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_member_level UNIQUE (tenant_id, store_id, name)
);

COMMENT ON TABLE public.operational_member_level IS '会员等级投影（master.member_level.*）';

DROP TRIGGER IF EXISTS trg_op_memberlvl_updated_at ON public.operational_member_level;
CREATE TRIGGER trg_op_memberlvl_updated_at BEFORE UPDATE ON public.operational_member_level
FOR EACH ROW EXECUTE FUNCTION public.yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. operational_room / operational_room_type（07 W2.4；C4 用）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.operational_room_type (
  id                VARCHAR(64) PRIMARY KEY,
  tenant_id         VARCHAR(36) NOT NULL,
  store_id          VARCHAR(36) NOT NULL,
  name              VARCHAR(96) NOT NULL,
  hourly_price_cents BIGINT     NOT NULL DEFAULT 0,
  minimum_spend_cents BIGINT     NOT NULL DEFAULT 0,
  status            VARCHAR(16) NOT NULL DEFAULT 'active',
  record_version    BIGINT      NOT NULL,
  source_event_id   VARCHAR(64),
  payload           JSONB       NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.operational_room_type IS '房型投影（master.room_type.*）';

DROP TRIGGER IF EXISTS trg_op_roomtype_updated_at ON public.operational_room_type;
CREATE TRIGGER trg_op_roomtype_updated_at BEFORE UPDATE ON public.operational_room_type
FOR EACH ROW EXECUTE FUNCTION public.yyc3_set_updated_at();

CREATE TABLE IF NOT EXISTS public.operational_room (
  id                VARCHAR(64) PRIMARY KEY,
  tenant_id         VARCHAR(36) NOT NULL,
  store_id          VARCHAR(36) NOT NULL,
  room_no           VARCHAR(48) NOT NULL,
  name              VARCHAR(96),
  room_type_id      VARCHAR(64),
  area_id           VARCHAR(64),
  floor             INTEGER,
  capacity          INTEGER,
  price_cents       BIGINT      NOT NULL DEFAULT 0,
  business_status   VARCHAR(16) NOT NULL DEFAULT 'available',
  record_version    BIGINT      NOT NULL,
  source_event_id   VARCHAR(64),
  source_command_id VARCHAR(64),
  payload           JSONB       NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_op_room UNIQUE (tenant_id, store_id, room_no),
  CONSTRAINT ck_op_room_status CHECK (business_status IN
    ('available','occupied','cleaning','maintenance','reserved','disabled'))
);

CREATE INDEX IF NOT EXISTS idx_op_room_store ON public.operational_room (tenant_id, store_id, business_status);
COMMENT ON TABLE public.operational_room IS '包厢投影（master.room.*）：business_status 为营业态快照';

DROP TRIGGER IF EXISTS trg_op_room_updated_at ON public.operational_room;
CREATE TRIGGER trg_op_room_updated_at BEFORE UPDATE ON public.operational_room
FOR EACH ROW EXECUTE FUNCTION public.yyc3_set_updated_at();

COMMIT;
