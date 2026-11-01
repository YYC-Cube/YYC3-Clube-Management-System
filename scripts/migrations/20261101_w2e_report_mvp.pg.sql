-- ============================================================================
-- W2-E 报表 MVP：报表定义 + 可行读模型视图
-- 依据：协同规范 08 §3.4、09 §5.5；MVP = 手册 4 组/8 张核心
-- 范围裁定：
--   report_definition（1 表）+ report_stock / report_deposit（2 视图，基于 W2-D 已建表）
--   report_bill / report_member 视图依赖交易投影（账单/会员，07 W4/W5 建表），
--   本批次仅在 report_definition 登记 target=W5，不建悬空视图（PostgreSQL 不允许
--   引用不存在表的视图）。
-- 执行：psql "$DATABASE_URL" -f scripts/migrations/20261101_w2e_report_mvp.pg.sql
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. report_definition：报表元数据/口径/列定义（98 张扩展同此登记）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS report_definition (
  id                 VARCHAR(64) PRIMARY KEY,
  report_key         VARCHAR(64) NOT NULL,
  name               VARCHAR(192) NOT NULL,
  report_group       VARCHAR(24) NOT NULL,
  source_view        VARCHAR(96),
  columns_def        JSONB       NOT NULL DEFAULT '[]'::jsonb,
  filters_def        JSONB       NOT NULL DEFAULT '[]'::jsonb,
  caliber_note       VARCHAR(512),
  status             VARCHAR(16) NOT NULL DEFAULT 'active',
  wave               SMALLINT    NOT NULL DEFAULT 1,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_report_key UNIQUE (report_key),
  CONSTRAINT ck_report_group CHECK (report_group IN ('sales', 'warehouse', 'member', 'deposit')),
  CONSTRAINT ck_report_status CHECK (status IN ('active', 'pending', 'retired'))
);

COMMENT ON TABLE report_definition IS '报表注册表：MVP 8 张 + 98 张扩展（wave 1/2/3）；视图只读，修正走调整单/命令（03 §5.2）';

DROP TRIGGER IF EXISTS trg_report_def_updated_at ON report_definition;
CREATE TRIGGER trg_report_def_updated_at
BEFORE UPDATE ON report_definition
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- MVP 8 张核心登记（账单 4 张挂 W5 交易投影；库存 2 张 + 寄存 1 张本批可用；会员充值 1 张挂 W5）
INSERT INTO report_definition (id, report_key, name, report_group, source_view, columns_def, status, wave) VALUES
  ('rpt_bill_detail',  'report_bill_detail',    '账单明细',       'sales',    'report_bill',    '[]', 'pending', 1),
  ('rpt_bill_summary', 'report_bill_summary',   '账单汇总',       'sales',    'report_bill',    '[]', 'pending', 1),
  ('rpt_revenue',      'report_revenue',        '营业收入',       'sales',    'report_bill',    '[]', 'pending', 1),
  ('rpt_profit',       'report_sales_profit',   '销售盈利',       'sales',    'report_bill',    '[]', 'pending', 1),
  ('rpt_stock_detail', 'report_stock_detail',   '库存数量明细',   'warehouse','report_stock',   '[]', 'active',  1),
  ('rpt_inout',        'report_stock_inout',    '进销存',         'warehouse','report_stock',   '[]', 'active',  1),
  ('rpt_member_charge','report_member_charge',  '会员充值',       'member',   'report_member',  '[]', 'pending', 1),
  ('rpt_deposit_sum',  'report_deposit_summary','寄存汇总',       'deposit',  'report_deposit', '[]', 'active',  1)
ON CONFLICT (report_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. report_stock（视图）：库存数量明细 + 进销存口径
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW report_stock AS
SELECT
  s.tenant_id,
  s.store_id,
  s.warehouse_id,
  w.name                 AS warehouse_name,
  s.product_id,
  p.name                 AS product_name,
  p.code                 AS product_code,
  s.quantity             AS on_hand_qty,
  s.reserved_quantity    AS reserved_qty,
  (s.quantity - s.reserved_quantity) AS available_qty,
  s.unit_cost_cents,
  ROUND(s.quantity * s.unit_cost_cents) AS stock_value_cents,
  s.updated_at           AS stock_updated_at,
  s.record_version
FROM operational_stock s
LEFT JOIN operational_warehouse w ON w.id = s.warehouse_id AND w.tenant_id = s.tenant_id AND w.store_id = s.store_id
LEFT JOIN operational_product p ON p.id = s.product_id AND p.tenant_id = s.tenant_id AND p.store_id = s.store_id;

COMMENT ON VIEW report_stock IS '库存明细读模型：数量/可用/库存金额（分）；进销存口径在此视图上按单据事件累计（09 §5.5）';

-- ----------------------------------------------------------------------------
-- 3. report_deposit（视图）：寄存汇总（在存/已取/充公）
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW report_deposit AS
SELECT
  d.tenant_id,
  d.store_id,
  d.member_id,
  d.product_id,
  p.name                AS product_name,
  d.status,
  COUNT(*)              AS record_count,
  SUM(d.quantity)       AS total_qty,
  SUM(CASE WHEN d.status = 'deposited' THEN d.quantity ELSE 0 END) AS deposited_qty,
  SUM(CASE WHEN d.status = 'withdrawn' THEN d.quantity ELSE 0 END) AS withdrawn_qty,
  SUM(CASE WHEN d.status = 'confiscated' THEN d.quantity ELSE 0 END) AS confiscated_qty,
  MIN(d.deposited_at)   AS first_deposited_at,
  MAX(d.updated_at)     AS last_changed_at
FROM operational_deposit d
LEFT JOIN operational_product p ON p.id = d.product_id AND p.tenant_id = d.tenant_id AND p.store_id = d.store_id
GROUP BY d.tenant_id, d.store_id, d.member_id, d.product_id, p.name, d.status;

COMMENT ON VIEW report_deposit IS '酒水存取汇总读模型：寄存/取酒/充公数量与时间（手册「酒水存取报表」组）';

COMMIT;
