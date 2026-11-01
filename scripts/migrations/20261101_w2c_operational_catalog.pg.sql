-- ============================================================================
-- W2-C 运营投影·商品 9 子模块（12 表）
-- 依据：协同规范 08 §3.2、09 §5.3；手册「商品」模块全覆盖
-- 命令通道：单条 record.upsert；批量 1~4 号表可经 catalog.import（09 §4.1）
-- 金额：BIGINT「分」（铁律 8）
-- 执行：psql "$DATABASE_URL" -f scripts/migrations/20261101_w2c_operational_catalog.pg.sql
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. operational_product：商品列表
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_product (
  id                 VARCHAR(36) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  code               VARCHAR(48) NOT NULL,
  name               VARCHAR(192) NOT NULL,
  category_id        VARCHAR(36),
  flavor_id          VARCHAR(36),
  unit               VARCHAR(16) NOT NULL DEFAULT '件',
  price_cents        BIGINT     NOT NULL DEFAULT 0,
  cost_cents         BIGINT     NOT NULL DEFAULT 0,
  barcode            VARCHAR(64),
  status             VARCHAR(16) NOT NULL DEFAULT 'active',
  sort_order         INTEGER    NOT NULL DEFAULT 0,
  record_version     BIGINT     NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB      NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_product_code UNIQUE (tenant_id, store_id, code),
  CONSTRAINT ck_product_status CHECK (status IN ('active', 'inactive', 'deleted')),
  CONSTRAINT ck_product_price CHECK (price_cents >= 0 AND cost_cents >= 0)
);

CREATE INDEX IF NOT EXISTS idx_op_product_store ON operational_product (tenant_id, store_id, status, sort_order);
CREATE INDEX IF NOT EXISTS idx_op_product_category ON operational_product (tenant_id, store_id, category_id);

COMMENT ON TABLE operational_product IS '商品投影（master.product.*；catalog.import 可批量写入）';

DROP TRIGGER IF EXISTS trg_op_product_updated_at ON operational_product;
CREATE TRIGGER trg_op_product_updated_at
BEFORE UPDATE ON operational_product
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. operational_product_category：商品类型
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_product_category (
  id                 VARCHAR(36) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  name               VARCHAR(96) NOT NULL,
  parent_id          VARCHAR(36),
  sort_order         INTEGER    NOT NULL DEFAULT 0,
  status             VARCHAR(16) NOT NULL DEFAULT 'active',
  record_version     BIGINT     NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB      NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_prod_category UNIQUE (tenant_id, store_id, name)
);

COMMENT ON TABLE operational_product_category IS '商品类型投影（master.product_category.*）';

DROP TRIGGER IF EXISTS trg_op_prodcat_updated_at ON operational_product_category;
CREATE TRIGGER trg_op_prodcat_updated_at
BEFORE UPDATE ON operational_product_category
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. operational_product_flavor：商品口味
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_product_flavor (
  id                 VARCHAR(36) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  name               VARCHAR(96) NOT NULL,
  group_key          VARCHAR(48),
  sort_order         INTEGER    NOT NULL DEFAULT 0,
  status             VARCHAR(16) NOT NULL DEFAULT 'active',
  record_version     BIGINT     NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB      NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_prod_flavor UNIQUE (tenant_id, store_id, name)
);

COMMENT ON TABLE operational_product_flavor IS '商品口味投影（master.product_flavor.*）';

DROP TRIGGER IF EXISTS trg_op_prodflv_updated_at ON operational_product_flavor;
CREATE TRIGGER trg_op_prodflv_updated_at
BEFORE UPDATE ON operational_product_flavor
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. operational_product_package：商品套餐
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_product_package (
  id                 VARCHAR(36) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  name               VARCHAR(192) NOT NULL,
  price_cents        BIGINT     NOT NULL DEFAULT 0,
  items              JSONB      NOT NULL DEFAULT '[]'::jsonb,
  status             VARCHAR(16) NOT NULL DEFAULT 'active',
  record_version     BIGINT     NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB      NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_pkg_price CHECK (price_cents >= 0)
);

COMMENT ON TABLE operational_product_package IS '商品套餐投影（master.package.*）；items=[{productId,qty,priceCents?}]';

DROP TRIGGER IF EXISTS trg_op_pkg_updated_at ON operational_product_package;
CREATE TRIGGER trg_op_pkg_updated_at
BEFORE UPDATE ON operational_product_package
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. operational_room_package：开房套餐名称
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_room_package (
  id                 VARCHAR(36) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  name               VARCHAR(192) NOT NULL,
  room_type_id       VARCHAR(36),
  status             VARCHAR(16) NOT NULL DEFAULT 'active',
  sort_order         INTEGER    NOT NULL DEFAULT 0,
  record_version     BIGINT     NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB      NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE operational_room_package IS '开房套餐名称投影（master.room_package.*；record.upsert 支持 copyFrom 复制新增，09 §4.1-3）';

DROP TRIGGER IF EXISTS trg_op_rpkg_updated_at ON operational_room_package;
CREATE TRIGGER trg_op_rpkg_updated_at
BEFORE UPDATE ON operational_room_package
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 6. operational_room_package_price：开房套餐价格（包段/时段维度）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_room_package_price (
  id                 VARCHAR(36) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  room_package_id    VARCHAR(36) NOT NULL,
  room_type_id       VARCHAR(36),
  segment_type       VARCHAR(16) NOT NULL DEFAULT 'package',
  price_cents        BIGINT     NOT NULL,
  min_charge_cents   BIGINT     NOT NULL DEFAULT 0,
  start_time         TIME,
  end_time           TIME,
  weekdays           VARCHAR(16) NOT NULL DEFAULT '1,2,3,4,5,6,7',
  status             VARCHAR(16) NOT NULL DEFAULT 'active',
  featured           BOOLEAN    NOT NULL DEFAULT FALSE,
  record_version     BIGINT     NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB      NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_rpkg_segment CHECK (segment_type IN ('package', 'hourly', 'overnight', 'segment')),
  CONSTRAINT ck_rpkg_price CHECK (price_cents >= 0 AND min_charge_cents >= 0)
);

CREATE INDEX IF NOT EXISTS idx_op_rpkg_price ON operational_room_package_price (tenant_id, store_id, room_package_id, status);

COMMENT ON TABLE operational_room_package_price IS '开房套餐价格投影（master.room_package_price.*；推举=featured）';

DROP TRIGGER IF EXISTS trg_op_rpkgpr_updated_at ON operational_room_package_price;
CREATE TRIGGER trg_op_rpkgpr_updated_at
BEFORE UPDATE ON operational_room_package_price
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 7. operational_time_rule：计时/包断规则
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_time_rule (
  id                 VARCHAR(36) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  name               VARCHAR(96) NOT NULL,
  rule_type          VARCHAR(16) NOT NULL,
  room_type_id       VARCHAR(36),
  start_time         TIME,
  end_time           TIME,
  base_minutes       INTEGER,
  price_cents        BIGINT     NOT NULL DEFAULT 0,
  overtime_price_cents BIGINT   NOT NULL DEFAULT 0,
  priority           SMALLINT   NOT NULL DEFAULT 0,
  status             VARCHAR(16) NOT NULL DEFAULT 'active',
  record_version     BIGINT     NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB      NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_time_rule_type CHECK (rule_type IN ('hourly', 'package', 'minimum_charge'))
);

COMMENT ON TABLE operational_time_rule IS '计时/包断/低消规则投影（master.pricing.*；包段优先级=priority）';

DROP TRIGGER IF EXISTS trg_op_timerule_updated_at ON operational_time_rule;
CREATE TRIGGER trg_op_timerule_updated_at
BEFORE UPDATE ON operational_time_rule
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 8. operational_pricing_rule：计价开关（不满 1 小时按 1 小时等）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_pricing_rule (
  id                 VARCHAR(36) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  rule_key           VARCHAR(48) NOT NULL,
  enabled            BOOLEAN     NOT NULL DEFAULT FALSE,
  config             JSONB       NOT NULL DEFAULT '{}'::jsonb,
  record_version     BIGINT      NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB       NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_pricing_rule UNIQUE (tenant_id, store_id, rule_key)
);

COMMENT ON TABLE operational_pricing_rule IS '计价开关投影：rule_key 如 partial_hour_round_up（不满 1 小时按 1 小时）；master.pricing_rule.*（08 §3.2-8）';

DROP TRIGGER IF EXISTS trg_op_prule_updated_at ON operational_pricing_rule;
CREATE TRIGGER trg_op_prule_updated_at
BEFORE UPDATE ON operational_pricing_rule
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 9. operational_delivery_rule：商品配送（固定/手工）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_delivery_rule (
  id                 VARCHAR(36) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  name               VARCHAR(96) NOT NULL,
  mode               VARCHAR(16) NOT NULL DEFAULT 'manual',
  area_id            VARCHAR(36),
  printer_id         VARCHAR(36),
  config             JSONB       NOT NULL DEFAULT '{}'::jsonb,
  status             VARCHAR(16) NOT NULL DEFAULT 'active',
  record_version     BIGINT      NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB       NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_delivery_mode CHECK (mode IN ('fixed', 'manual'))
);

COMMENT ON TABLE operational_delivery_rule IS '商品配送规则投影（master.delivery_rule.*）';

DROP TRIGGER IF EXISTS trg_op_deliv_updated_at ON operational_delivery_rule;
CREATE TRIGGER trg_op_deliv_updated_at
BEFORE UPDATE ON operational_delivery_rule
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 10. operational_room_snack_rule：开房小吃（收费/免费）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_room_snack_rule (
  id                 VARCHAR(36) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  name               VARCHAR(96) NOT NULL,
  charge_mode        VARCHAR(16) NOT NULL DEFAULT 'free',
  room_type_id       VARCHAR(36),
  room_package_id    VARCHAR(36),
  items              JSONB       NOT NULL DEFAULT '[]'::jsonb,
  price_cents        BIGINT      NOT NULL DEFAULT 0,
  status             VARCHAR(16) NOT NULL DEFAULT 'active',
  record_version     BIGINT      NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB       NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_snack_mode CHECK (charge_mode IN ('free', 'charged', 'per_person'))
);

COMMENT ON TABLE operational_room_snack_rule IS '开房小吃规则投影（master.room_snack.*）';

DROP TRIGGER IF EXISTS trg_op_snack_updated_at ON operational_room_snack_rule;
CREATE TRIGGER trg_op_snack_updated_at
BEFORE UPDATE ON operational_room_snack_rule
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 11. operational_price_strategy：价格策略（区域/包厢维度）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_price_strategy (
  id                 VARCHAR(36) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  name               VARCHAR(96) NOT NULL,
  scope_type         VARCHAR(16) NOT NULL DEFAULT 'store',
  scope_id           VARCHAR(36),
  strategy           VARCHAR(24) NOT NULL,
  adjust_percent     NUMERIC(6,3) NOT NULL DEFAULT 0,
  config             JSONB       NOT NULL DEFAULT '{}'::jsonb,
  status             VARCHAR(16) NOT NULL DEFAULT 'active',
  record_version     BIGINT      NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB       NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_strategy_scope CHECK (scope_type IN ('store', 'area', 'room_type', 'room')),
  CONSTRAINT ck_strategy_type CHECK (strategy IN ('discount', 'surcharge', 'fixed', 'member_price', 'happy_hour'))
);

COMMENT ON TABLE operational_price_strategy IS '价格策略投影（master.price_strategy.*）；调整比例用 NUMERIC 仅作展示系数，落单金额仍整数分';

DROP TRIGGER IF EXISTS trg_op_prstrat_updated_at ON operational_price_strategy;
CREATE TRIGGER trg_op_prstrat_updated_at
BEFORE UPDATE ON operational_price_strategy
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 12. operational_points_exchange_rule：积分兑换
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_points_exchange_rule (
  id                 VARCHAR(36) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  product_id         VARCHAR(36),
  points_required    INTEGER     NOT NULL DEFAULT 0,
  points_per_yuan    INTEGER     NOT NULL DEFAULT 0,
  daily_limit        INTEGER,
  status             VARCHAR(16) NOT NULL DEFAULT 'active',
  config             JSONB       NOT NULL DEFAULT '{}'::jsonb,
  record_version     BIGINT      NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB       NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_points CHECK (points_required >= 0 AND points_per_yuan >= 0)
);

COMMENT ON TABLE operational_points_exchange_rule IS '积分兑换规则投影（master.points_exchange.*）';

DROP TRIGGER IF EXISTS trg_op_points_updated_at ON operational_points_exchange_rule;
CREATE TRIGGER trg_op_points_updated_at
BEFORE UPDATE ON operational_points_exchange_rule
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

COMMIT;
