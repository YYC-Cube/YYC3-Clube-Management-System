-- ============================================================================
-- 艺人域建表脚本（PostgreSQL 13+）
-- 目标：支撑「艺人上下钟明细/汇总」「台费扣款明细」「台费流水汇总」四张报表
-- 说明：
--   1. 与 lib/db/pg.ts 保持一致，使用 PostgreSQL；
--   2. 金额统一 NUMERIC(10,2)，禁止浮点；
--   3. 时间统一 TIMESTAMPTZ，应用层按 Asia/Shanghai 展示；
--   4. 主键由应用层生成（crypto.randomUUID），与现有 VARCHAR(36) 主键风格一致；
--   5. 脚本可重复执行（IF NOT EXISTS + DROP TRIGGER IF EXISTS）。
-- 执行：psql "$DATABASE_URL" -f scripts/migrations/20261031_artist_domain.pg.sql
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0. 通用 updated_at 触发器函数
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION yyc3_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 1. 艺人档案
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS artist (
  id          VARCHAR(36) PRIMARY KEY,
  artist_no   VARCHAR(32) NOT NULL,
  name        VARCHAR(64) NOT NULL,
  level       VARCHAR(16) NOT NULL,
  store_id    VARCHAR(36) NOT NULL,
  phone       VARCHAR(32),
  status      VARCHAR(16) NOT NULL DEFAULT 'active',
  joined_at   DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_artist_no UNIQUE (artist_no),
  CONSTRAINT ck_artist_level CHECK (level IN ('首席', '金牌', '银牌', '铜牌')),
  CONSTRAINT ck_artist_status CHECK (status IN ('active', 'left'))
);

COMMENT ON TABLE artist IS '艺人档案';
COMMENT ON COLUMN artist.artist_no IS '艺人编号（业务唯一）';
COMMENT ON COLUMN artist.level IS '艺人等级：首席/金牌/银牌/铜牌';
COMMENT ON COLUMN artist.status IS '在职状态：active 在职 / left 离职';
COMMENT ON COLUMN artist.phone IS '手机号（敏感字段，按角色脱敏展示）';

DROP TRIGGER IF EXISTS trg_artist_updated_at ON artist;
CREATE TRIGGER trg_artist_updated_at
BEFORE UPDATE ON artist
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. 艺人上下钟记录（一次服务 = 一条记录）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS artist_clock_record (
  id                VARCHAR(36) PRIMARY KEY,
  record_no         VARCHAR(32) NOT NULL,
  artist_id         VARCHAR(36) NOT NULL,
  store_id          VARCHAR(36) NOT NULL,
  room_no           VARCHAR(32) NOT NULL,
  guest_name        VARCHAR(64),
  clock_in_at       TIMESTAMPTZ NOT NULL,
  clock_out_at      TIMESTAMPTZ,
  duration_minutes  INTEGER NOT NULL DEFAULT 0,
  stage_fee         NUMERIC(10,2) NOT NULL DEFAULT 0,
  status            VARCHAR(16) NOT NULL DEFAULT 'serving',
  operator_id       VARCHAR(36),
  remark            VARCHAR(255),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_clock_record_no UNIQUE (record_no),
  CONSTRAINT fk_clock_artist FOREIGN KEY (artist_id) REFERENCES artist(id) ON DELETE RESTRICT,
  CONSTRAINT ck_clock_duration CHECK (duration_minutes >= 0),
  CONSTRAINT ck_clock_stage_fee CHECK (stage_fee >= 0),
  CONSTRAINT ck_clock_status CHECK (status IN ('serving', 'unsettled', 'settled')),
  CONSTRAINT ck_clock_time CHECK (clock_out_at IS NULL OR clock_out_at >= clock_in_at)
);

COMMENT ON TABLE artist_clock_record IS '艺人上下钟记录';
COMMENT ON COLUMN artist_clock_record.clock_out_at IS '下钟时间；NULL 表示服务中';
COMMENT ON COLUMN artist_clock_record.duration_minutes IS '服务时长（分钟），由服务端按下钟-上钟计算';
COMMENT ON COLUMN artist_clock_record.stage_fee IS '台费金额';
COMMENT ON COLUMN artist_clock_record.status IS 'serving 服务中 / unsettled 待结算 / settled 已结算';

DROP TRIGGER IF EXISTS trg_clock_updated_at ON artist_clock_record;
CREATE TRIGGER trg_clock_updated_at
BEFORE UPDATE ON artist_clock_record
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. 台费扣款（可撤销，撤销不影响历史留痕）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS artist_fee_deduction (
  id                VARCHAR(36) PRIMARY KEY,
  deduction_no      VARCHAR(32) NOT NULL,
  clock_record_id   VARCHAR(36) NOT NULL,
  artist_id         VARCHAR(36) NOT NULL,
  type              VARCHAR(32) NOT NULL,
  amount            NUMERIC(10,2) NOT NULL,
  reason            VARCHAR(255) NOT NULL,
  status            VARCHAR(16) NOT NULL DEFAULT 'pending',
  operator_id       VARCHAR(36),
  approved_by       VARCHAR(36),
  approved_at       TIMESTAMPTZ,
  revoked_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_deduction_no UNIQUE (deduction_no),
  CONSTRAINT fk_deduction_clock FOREIGN KEY (clock_record_id) REFERENCES artist_clock_record(id) ON DELETE RESTRICT,
  CONSTRAINT fk_deduction_artist FOREIGN KEY (artist_id) REFERENCES artist(id) ON DELETE RESTRICT,
  CONSTRAINT ck_deduction_amount CHECK (amount >= 0),
  CONSTRAINT ck_deduction_type CHECK (type IN ('late', 'early_leave', 'absent', 'complaint', 'violation', 'equipment', 'other')),
  CONSTRAINT ck_deduction_status CHECK (status IN ('pending', 'confirmed', 'revoked')),
  CONSTRAINT ck_deduction_revoked CHECK (
    (status = 'revoked' AND revoked_at IS NOT NULL)
    OR (status <> 'revoked')
  )
);

COMMENT ON TABLE artist_fee_deduction IS '艺人台费扣款';
COMMENT ON COLUMN artist_fee_deduction.type IS 'late 迟到 / early_leave 早退 / absent 缺勤 / complaint 服务投诉 / violation 违规罚款 / equipment 设备损坏 / other 其他';
COMMENT ON COLUMN artist_fee_deduction.status IS 'pending 待确认 / confirmed 已扣款 / revoked 已撤销（统计时排除）';

DROP TRIGGER IF EXISTS trg_deduction_updated_at ON artist_fee_deduction;
CREATE TRIGGER trg_deduction_updated_at
BEFORE UPDATE ON artist_fee_deduction
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. 台费结算单（按艺人 + 结算周期）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS artist_fee_settlement (
  id                VARCHAR(36) PRIMARY KEY,
  settlement_no     VARCHAR(32) NOT NULL,
  artist_id         VARCHAR(36) NOT NULL,
  period_start      DATE NOT NULL,
  period_end        DATE NOT NULL,
  stage_fee_total   NUMERIC(10,2) NOT NULL DEFAULT 0,
  deduction_total   NUMERIC(10,2) NOT NULL DEFAULT 0,
  net_fee           NUMERIC(10,2) NOT NULL DEFAULT 0,
  settled_fee       NUMERIC(10,2) NOT NULL DEFAULT 0,
  status            VARCHAR(16) NOT NULL DEFAULT 'pending',
  settled_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_settlement_no UNIQUE (settlement_no),
  CONSTRAINT uq_settlement_period UNIQUE (artist_id, period_start, period_end),
  CONSTRAINT fk_settlement_artist FOREIGN KEY (artist_id) REFERENCES artist(id) ON DELETE RESTRICT,
  CONSTRAINT ck_settlement_period CHECK (period_end >= period_start),
  CONSTRAINT ck_settlement_amount CHECK (stage_fee_total >= 0 AND deduction_total >= 0 AND net_fee >= 0 AND settled_fee >= 0),
  CONSTRAINT ck_settlement_status CHECK (status IN ('pending', 'partial', 'settled')),
  CONSTRAINT ck_settlement_time CHECK (status <> 'settled' OR settled_at IS NOT NULL)
);

COMMENT ON TABLE artist_fee_settlement IS '艺人台费结算单（按艺人+周期）';
COMMENT ON COLUMN artist_fee_settlement.status IS 'pending 待结算 / partial 部分结算 / settled 已结算';
COMMENT ON COLUMN artist_fee_settlement.net_fee IS '应结台费 = stage_fee_total - deduction_total';
COMMENT ON COLUMN artist_fee_settlement.settled_fee IS '已结金额，累计值';

DROP TRIGGER IF EXISTS trg_settlement_updated_at ON artist_fee_settlement;
CREATE TRIGGER trg_settlement_updated_at
BEFORE UPDATE ON artist_fee_settlement
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. 结算明细（结算单 ↔ 上下钟记录，保证台费可追溯、可复核）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS artist_fee_settlement_item (
  id                VARCHAR(36) PRIMARY KEY,
  settlement_id     VARCHAR(36) NOT NULL,
  clock_record_id   VARCHAR(36) NOT NULL,
  stage_fee         NUMERIC(10,2) NOT NULL DEFAULT 0,
  deduction         NUMERIC(10,2) NOT NULL DEFAULT 0,
  net_fee           NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_settlement_clock UNIQUE (clock_record_id),
  CONSTRAINT fk_item_settlement FOREIGN KEY (settlement_id) REFERENCES artist_fee_settlement(id) ON DELETE CASCADE,
  CONSTRAINT fk_item_clock FOREIGN KEY (clock_record_id) REFERENCES artist_clock_record(id) ON DELETE RESTRICT,
  CONSTRAINT ck_item_amount CHECK (stage_fee >= 0 AND deduction >= 0 AND net_fee >= 0)
);

COMMENT ON TABLE artist_fee_settlement_item IS '台费结算明细';
COMMENT ON COLUMN artist_fee_settlement_item.net_fee IS '该上钟单实收台费 = stage_fee - deduction';

-- ----------------------------------------------------------------------------
-- 6. 报表查询索引
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_artist_store_status ON artist (store_id, status);
CREATE INDEX IF NOT EXISTS idx_clock_store_time ON artist_clock_record (store_id, clock_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_clock_artist_time ON artist_clock_record (artist_id, clock_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_clock_status ON artist_clock_record (status);
CREATE INDEX IF NOT EXISTS idx_deduction_clock ON artist_fee_deduction (clock_record_id);
CREATE INDEX IF NOT EXISTS idx_deduction_artist_time ON artist_fee_deduction (artist_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deduction_status ON artist_fee_deduction (status);
CREATE INDEX IF NOT EXISTS idx_settlement_artist_period ON artist_fee_settlement (artist_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_settlement_status ON artist_fee_settlement (status);
CREATE INDEX IF NOT EXISTS idx_settlement_item_settlement ON artist_fee_settlement_item (settlement_id);

COMMIT;

-- ============================================================================
-- 业务口径（应用层必须遵守，数据库约束已覆盖关键部分）
-- ----------------------------------------------------------------------------
-- 1. 实收台费   = 上钟单台费 - SUM(有效扣款)，有效扣款 = status <> 'revoked'
-- 2. 应结台费   = 已结金额 + 待结金额
-- 3. 结算进度   = 已结金额 / 应结台费（应结为 0 时返回 0，避免除零）
-- 4. 服务中记录：clock_out_at IS NULL，不计入“平均时长”，但计入上钟次数
-- 5. 撤销扣款：status = 'revoked' + revoked_at 必填，报表统计排除，历史保留
-- 6. 同一上钟单仅允许进入一张结算单（uq_settlement_clock）
--
-- 常用聚合 SQL：
-- SELECT r.artist_id,
--        COUNT(*) AS clock_count,
--        SUM(r.duration_minutes) AS total_minutes,
--        SUM(r.stage_fee) AS stage_fee_total,
--        COALESCE(SUM(d.deduction), 0) AS deduction_total,
--        SUM(r.stage_fee) - COALESCE(SUM(d.deduction), 0) AS net_fee
--   FROM artist_clock_record r
--   LEFT JOIN (
--     SELECT clock_record_id, SUM(amount) AS deduction
--       FROM artist_fee_deduction
--      WHERE status <> 'revoked'
--      GROUP BY clock_record_id
--   ) d ON d.clock_record_id = r.id
--  WHERE r.clock_in_at >= $1
--    AND r.clock_in_at <  $2
--  GROUP BY r.artist_id
--  ORDER BY net_fee DESC;
-- ============================================================================
