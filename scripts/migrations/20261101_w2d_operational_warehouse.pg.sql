-- ============================================================================
-- W2-D 运营投影·仓库 12 子模块（12 表）
-- 依据：协同规范 08 §3.3、09 §5.4；手册「仓库」模块全覆盖
-- 命令边界（09 §4.2 裁定）：
--   主数据/规则（1~3、12 号表）→ record.upsert
--   六类单据（7~12 号表）→ stock.document（documentType 枚举对齐）
--   实时库存/寄存（5、6 号表）→ 只读投影：App 写、PC 查
-- 执行：psql "$DATABASE_URL" -f scripts/migrations/20261101_w2d_operational_warehouse.pg.sql
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. operational_warehouse：仓库（主数据）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_warehouse (
  id                 VARCHAR(36) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  code               VARCHAR(48) NOT NULL,
  name               VARCHAR(96) NOT NULL,
  warehouse_type     VARCHAR(16) NOT NULL DEFAULT 'main',
  manager_id         VARCHAR(64),
  status             VARCHAR(16) NOT NULL DEFAULT 'active',
  record_version     BIGINT      NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB       NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_warehouse UNIQUE (tenant_id, store_id, code),
  CONSTRAINT ck_warehouse_type CHECK (warehouse_type IN ('main', 'sub', 'temporary'))
);

COMMENT ON TABLE operational_warehouse IS '仓库投影（master.warehouse.*；主数据走 record.upsert，不入 stock.document）';

DROP TRIGGER IF EXISTS trg_op_wh_updated_at ON operational_warehouse;
CREATE TRIGGER trg_op_wh_updated_at
BEFORE UPDATE ON operational_warehouse
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. operational_warehouse_rule：出货仓规则（区域→仓库）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_warehouse_rule (
  id                 VARCHAR(36) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  area_id            VARCHAR(36),
  warehouse_id       VARCHAR(36) NOT NULL,
  priority           SMALLINT    NOT NULL DEFAULT 0,
  status             VARCHAR(16) NOT NULL DEFAULT 'active',
  record_version     BIGINT      NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB       NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE operational_warehouse_rule IS '出货仓规则投影（master.warehouse_rule.*）';

DROP TRIGGER IF EXISTS trg_op_whrule_updated_at ON operational_warehouse_rule;
CREATE TRIGGER trg_op_whrule_updated_at
BEFORE UPDATE ON operational_warehouse_rule
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. operational_supplier：供应商（主数据）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_supplier (
  id                 VARCHAR(36) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  code               VARCHAR(48) NOT NULL,
  name               VARCHAR(192) NOT NULL,
  contact            VARCHAR(96),
  phone              VARCHAR(32),
  status             VARCHAR(16) NOT NULL DEFAULT 'active',
  record_version     BIGINT      NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB       NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_supplier UNIQUE (tenant_id, store_id, code)
);

COMMENT ON TABLE operational_supplier IS '供应商投影（master.supplier.*）';

DROP TRIGGER IF EXISTS trg_op_supplier_updated_at ON operational_supplier;
CREATE TRIGGER trg_op_supplier_updated_at
BEFORE UPDATE ON operational_supplier
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. operational_stock_policy：库存不足是否出货（规则）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_stock_policy (
  id                 VARCHAR(36) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  warehouse_id       VARCHAR(36),
  allow_negative     BOOLEAN     NOT NULL DEFAULT FALSE,
  threshold          INTEGER     NOT NULL DEFAULT 0,
  config             JSONB       NOT NULL DEFAULT '{}'::jsonb,
  record_version     BIGINT      NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB       NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_stock_policy UNIQUE (tenant_id, store_id, warehouse_id)
);

COMMENT ON TABLE operational_stock_policy IS '库存不足出货策略投影（master.stock_policy.*；主数据/规则，非单据）';

DROP TRIGGER IF EXISTS trg_op_stockpol_updated_at ON operational_stock_policy;
CREATE TRIGGER trg_op_stockpol_updated_at
BEFORE UPDATE ON operational_stock_policy
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. operational_stock：实时库存（只读投影）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_stock (
  id                 VARCHAR(64) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  warehouse_id       VARCHAR(36) NOT NULL,
  product_id         VARCHAR(36) NOT NULL,
  quantity           NUMERIC(14,3) NOT NULL DEFAULT 0,
  reserved_quantity  NUMERIC(14,3) NOT NULL DEFAULT 0,
  unit_cost_cents    BIGINT      NOT NULL DEFAULT 0,
  updated_by_event   VARCHAR(64),
  record_version     BIGINT      NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB       NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_stock UNIQUE (tenant_id, store_id, warehouse_id, product_id),
  CONSTRAINT ck_stock_qty CHECK (quantity >= 0)
);

CREATE INDEX IF NOT EXISTS idx_op_stock_low ON operational_stock (tenant_id, store_id, quantity);

COMMENT ON TABLE operational_stock IS '实时库存投影（inventory.stock.updated）：PC 查询/预警只读；数量 NUMERIC 支持称重商品';

DROP TRIGGER IF EXISTS trg_op_stock_updated_at ON operational_stock;
CREATE TRIGGER trg_op_stock_updated_at
BEFORE UPDATE ON operational_stock
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 6. operational_deposit：寄存管理（交易事实，App 写、PC 查）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_deposit (
  id                 VARCHAR(64) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  member_id          VARCHAR(64),
  product_id         VARCHAR(36) NOT NULL,
  quantity           NUMERIC(14,3) NOT NULL,
  status             VARCHAR(16) NOT NULL DEFAULT 'deposited',
  deposited_at       TIMESTAMPTZ,
  withdrawn_at       TIMESTAMPTZ,
  confiscated_at     TIMESTAMPTZ,
  expire_at          TIMESTAMPTZ,
  record_version     BIGINT      NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB       NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_deposit_status CHECK (status IN ('deposited', 'withdrawn', 'confiscated', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_op_deposit_member ON operational_deposit (tenant_id, store_id, member_id, status);

COMMENT ON TABLE operational_deposit IS '寄存/取酒/充公投影（deposit.*）：酒水存取报表的事实来源';

DROP TRIGGER IF EXISTS trg_op_deposit_updated_at ON operational_deposit;
CREATE TRIGGER trg_op_deposit_updated_at
BEFORE UPDATE ON operational_deposit
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 7. operational_purchase_order：采购进货单（stock.document purchase）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_purchase_order (
  id                 VARCHAR(64) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  doc_no             VARCHAR(48) NOT NULL,
  supplier_id        VARCHAR(36),
  warehouse_id       VARCHAR(36) NOT NULL,
  status             VARCHAR(16) NOT NULL DEFAULT 'draft',
  total_amount_cents BIGINT      NOT NULL DEFAULT 0,
  items              JSONB       NOT NULL DEFAULT '[]'::jsonb,
  reason             VARCHAR(255),
  approval_id        VARCHAR(64),
  posted_at          TIMESTAMPTZ,
  record_version     BIGINT      NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB       NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_purchase_doc UNIQUE (tenant_id, store_id, doc_no),
  CONSTRAINT ck_purchase_status CHECK (status IN ('draft', 'posted', 'cancelled'))
);

COMMENT ON TABLE operational_purchase_order IS '采购进货单投影（inventory.purchase.posted）；items=[{skuId/productId,qty,unitCostCents,batchNo,expiry?}]（09 §2.2）';

DROP TRIGGER IF EXISTS trg_op_purchase_updated_at ON operational_purchase_order;
CREATE TRIGGER trg_op_purchase_updated_at
BEFORE UPDATE ON operational_purchase_order
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 8. operational_purchase_return：采购退货单（stock.document purchase_return）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_purchase_return (
  id                 VARCHAR(64) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  doc_no             VARCHAR(48) NOT NULL,
  source_doc_id      VARCHAR(64),
  supplier_id        VARCHAR(36),
  warehouse_id       VARCHAR(36) NOT NULL,
  status             VARCHAR(16) NOT NULL DEFAULT 'draft',
  total_amount_cents BIGINT      NOT NULL DEFAULT 0,
  items              JSONB       NOT NULL DEFAULT '[]'::jsonb,
  reason             VARCHAR(255),
  approval_id        VARCHAR(64),
  posted_at          TIMESTAMPTZ,
  record_version     BIGINT      NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB       NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_purret_doc UNIQUE (tenant_id, store_id, doc_no),
  CONSTRAINT ck_purret_status CHECK (status IN ('draft', 'posted', 'cancelled'))
);

COMMENT ON TABLE operational_purchase_return IS '采购退货单投影（inventory.purchase_return.posted）；退货数量 ≤ 原采购入库数量由 App 校验（09 §2.2）';

DROP TRIGGER IF EXISTS trg_op_purret_updated_at ON operational_purchase_return;
CREATE TRIGGER trg_op_purret_updated_at
BEFORE UPDATE ON operational_purchase_return
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 9. operational_stock_transfer：库存调拨单（stock.document transfer）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_stock_transfer (
  id                 VARCHAR(64) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  doc_no             VARCHAR(48) NOT NULL,
  from_warehouse_id  VARCHAR(36) NOT NULL,
  to_warehouse_id    VARCHAR(36) NOT NULL,
  cross_store        BOOLEAN     NOT NULL DEFAULT FALSE,
  to_store_id        VARCHAR(36),
  status             VARCHAR(16) NOT NULL DEFAULT 'draft',
  items              JSONB       NOT NULL DEFAULT '[]'::jsonb,
  reason             VARCHAR(255),
  approval_id        VARCHAR(64),
  posted_at          TIMESTAMPTZ,
  record_version     BIGINT      NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB       NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_transfer_doc UNIQUE (tenant_id, store_id, doc_no),
  CONSTRAINT ck_transfer_status CHECK (status IN ('draft', 'posted', 'cancelled')),
  CONSTRAINT ck_transfer_wh CHECK (from_warehouse_id <> to_warehouse_id)
);

COMMENT ON TABLE operational_stock_transfer IS '库存调拨单投影（inventory.transfer.posted）；同店跨仓/跨店策略由 App 裁定';

DROP TRIGGER IF EXISTS trg_op_transfer_updated_at ON operational_stock_transfer;
CREATE TRIGGER trg_op_transfer_updated_at
BEFORE UPDATE ON operational_stock_transfer
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 10. operational_stock_damage：报损单（stock.document damage；需原因+审批）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_stock_damage (
  id                 VARCHAR(64) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  doc_no             VARCHAR(48) NOT NULL,
  warehouse_id       VARCHAR(36) NOT NULL,
  damage_type        VARCHAR(24) NOT NULL DEFAULT 'other',
  status             VARCHAR(16) NOT NULL DEFAULT 'draft',
  total_amount_cents BIGINT      NOT NULL DEFAULT 0,
  items              JSONB       NOT NULL DEFAULT '[]'::jsonb,
  reason             VARCHAR(255) NOT NULL,
  approval_id        VARCHAR(64),
  posted_at          TIMESTAMPTZ,
  record_version     BIGINT      NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB       NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_damage_doc UNIQUE (tenant_id, store_id, doc_no),
  CONSTRAINT ck_damage_status CHECK (status IN ('draft', 'posted', 'cancelled')),
  CONSTRAINT ck_damage_type CHECK (damage_type IN ('broken', 'expired', 'lost', 'donated', 'other'))
);

COMMENT ON TABLE operational_stock_damage IS '报损单投影（inventory.damage.posted）；高危：必填原因 + 审批（09 §2.2）';

DROP TRIGGER IF EXISTS trg_op_damage_updated_at ON operational_stock_damage;
CREATE TRIGGER trg_op_damage_updated_at
BEFORE UPDATE ON operational_stock_damage
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 11. operational_stock_requisition：领用单（stock.document requisition）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_stock_requisition (
  id                 VARCHAR(64) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  doc_no             VARCHAR(48) NOT NULL,
  warehouse_id       VARCHAR(36) NOT NULL,
  requisition_by     VARCHAR(64) NOT NULL,
  department         VARCHAR(64),
  status             VARCHAR(16) NOT NULL DEFAULT 'draft',
  total_amount_cents BIGINT      NOT NULL DEFAULT 0,
  items              JSONB       NOT NULL DEFAULT '[]'::jsonb,
  purpose            VARCHAR(255),
  posted_at          TIMESTAMPTZ,
  record_version     BIGINT      NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB       NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_req_doc UNIQUE (tenant_id, store_id, doc_no),
  CONSTRAINT ck_req_status CHECK (status IN ('draft', 'posted', 'cancelled'))
);

COMMENT ON TABLE operational_stock_requisition IS '领用单投影（inventory.requisition.posted）；领用人/用途必填（09 §2.2）';

DROP TRIGGER IF EXISTS trg_op_req_updated_at ON operational_stock_requisition;
CREATE TRIGGER trg_op_req_updated_at
BEFORE UPDATE ON operational_stock_requisition
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 12. operational_stock_count：库存盘点单（stock.document count；盘盈亏需原因）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_stock_count (
  id                 VARCHAR(64) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  doc_no             VARCHAR(48) NOT NULL,
  warehouse_id       VARCHAR(36) NOT NULL,
  status             VARCHAR(16) NOT NULL DEFAULT 'counting',
  counted_at         TIMESTAMPTZ,
  variance_amount_cents BIGINT  NOT NULL DEFAULT 0,
  items              JSONB       NOT NULL DEFAULT '[]'::jsonb,
  variance_reason    VARCHAR(255),
  approval_id        VARCHAR(64),
  posted_at          TIMESTAMPTZ,
  record_version     BIGINT      NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB       NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_count_doc UNIQUE (tenant_id, store_id, doc_no),
  CONSTRAINT ck_count_status CHECK (status IN ('counting', 'posted', 'cancelled'))
);

COMMENT ON TABLE operational_stock_count IS '库存盘点单投影（inventory.count.posted）；items 含 systemQty/actualQty/variance；盘盈盘亏必填 variance_reason（09 §2.2）';

DROP TRIGGER IF EXISTS trg_op_count_updated_at ON operational_stock_count;
CREATE TRIGGER trg_op_count_updated_at
BEFORE UPDATE ON operational_stock_count
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

COMMIT;
