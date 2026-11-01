-- ============================================================================
-- W2-A 横切表：同步事件日志 / 命令日志 / 导入任务 / 账单更正 / 字段 owner
-- 依据：协同规范 03 §5.1（sync_event_log）、02 §6（命令通道）、09 §5.1 批次 W2-A
-- 约定：
--   1. PostgreSQL 13+；public schema（沿用 20261031_artist_domain 先例）；
--   2. 金额一律 BIGINT「分」（协同规范铁律 8；区别于艺人域旧表 NUMERIC）；
--   3. 时间 TIMESTAMPTZ；主键 VARCHAR(36)/业务前缀 ID 由生产方生成；
--   4. 脚本可重复执行（IF NOT EXISTS / ON CONFLICT DO NOTHING）；
--   5. 门店级 operational_* 投影禁止后台直写，只由事件投影或命令回执更新（02 §9）。
-- 执行：psql "$DATABASE_URL" -f scripts/migrations/20261101_w2a_sync_cross_cutting.pg.sql
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0. 通用 updated_at 触发器（与艺人域迁移同名同实现，幂等）
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION yyc3_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 1. sync_event_log：App→CMS 事件日志（03 §5.1 逐字段对齐；逻辑名 cms.sync_event_log）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_event_log (
  event_id         VARCHAR(64) PRIMARY KEY,
  event_type       VARCHAR(96) NOT NULL,
  event_version    INTEGER      NOT NULL DEFAULT 1,
  aggregate_type   VARCHAR(64)  NOT NULL,
  aggregate_id     VARCHAR(64)  NOT NULL,
  tenant_id        VARCHAR(36)  NOT NULL,
  store_id         VARCHAR(36)  NOT NULL,
  sequence         BIGINT       NOT NULL,
  writer           VARCHAR(16)  NOT NULL DEFAULT 'app',
  record_version   BIGINT,
  command_id       VARCHAR(64),
  occurred_at      TIMESTAMPTZ  NOT NULL,
  received_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  producer         VARCHAR(64)  NOT NULL DEFAULT 'yyc3-club-ops',
  payload          JSONB        NOT NULL,
  payload_checksum VARCHAR(128) NOT NULL,
  status           VARCHAR(16)  NOT NULL DEFAULT 'applied',
  CONSTRAINT ck_event_status CHECK (status IN ('applied', 'duplicate', 'rejected', 'dead'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_event_sequence
  ON sync_event_log (aggregate_type, aggregate_id, sequence);
CREATE INDEX IF NOT EXISTS idx_event_log_store_time ON sync_event_log (tenant_id, store_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_log_type ON sync_event_log (event_type, occurred_at DESC);

COMMENT ON TABLE sync_event_log IS 'App→CMS 事件日志：去重/顺序/幂等投影的事实来源（协同规范 03 §5）';
COMMENT ON COLUMN sync_event_log.writer IS '写入方：app=App 事件；cms=中央配置回执';
COMMENT ON COLUMN sync_event_log.command_id IS '若该版本由 PC 纠正命令触发，记录 commandId';

-- ----------------------------------------------------------------------------
-- 2. command_log：CMS→App 命令全生命周期（02 §6；状态机 issued→delivered→applied/rejected）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS command_log (
  command_id       VARCHAR(64) PRIMARY KEY,
  command_type     VARCHAR(64) NOT NULL,
  aggregate_type   VARCHAR(64) NOT NULL,
  aggregate_id     VARCHAR(64),
  tenant_id        VARCHAR(36) NOT NULL,
  store_id         VARCHAR(36) NOT NULL,
  command_version  BIGINT      NOT NULL DEFAULT 1,
  idempotency_key  VARCHAR(128),
  payload          JSONB       NOT NULL,
  reason           VARCHAR(255),
  operator_id      VARCHAR(64) NOT NULL,
  approval_id      VARCHAR(64),
  status           VARCHAR(16) NOT NULL DEFAULT 'issued',
  error_code       VARCHAR(48),
  result           JSONB,
  result_event_id  VARCHAR(64),
  issued_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at     TIMESTAMPTZ,
  ack_at           TIMESTAMPTZ,
  next_retry_at    TIMESTAMPTZ,
  attempts         INTEGER     NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_command_status
    CHECK (status IN ('issued', 'delivered', 'applied', 'rejected', 'timeout', 'dead')),
  CONSTRAINT uq_command_idempotency UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_command_log_store ON command_log (tenant_id, store_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_command_log_status ON command_log (status, next_retry_at);

COMMENT ON TABLE command_log IS 'CMS→App 纠正命令日志：issued→delivered→applied/rejected；超时/死信由调度回收（02 §6、09 §3-8）';
COMMENT ON COLUMN command_log.command_type IS 'record.upsert/catalog.import/stock.document/bill.correct/settings.update/device.update/vod.update/movie.import/staff.import/artist_setting.update 等（08 §5.2）';

DROP TRIGGER IF EXISTS trg_command_log_updated_at ON command_log;
CREATE TRIGGER trg_command_log_updated_at
BEFORE UPDATE ON command_log
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. import_job：PC 批量导入任务（catalog/staff/movie；09 §2.1）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS import_job (
  job_id          VARCHAR(64) PRIMARY KEY,
  kind            VARCHAR(32)  NOT NULL,
  tenant_id       VARCHAR(36)  NOT NULL,
  store_id        VARCHAR(36)  NOT NULL,
  file_name       VARCHAR(255) NOT NULL,
  file_checksum   VARCHAR(128) NOT NULL,
  mode            VARCHAR(16)  NOT NULL DEFAULT 'apply',
  conflict_policy VARCHAR(16)  NOT NULL DEFAULT 'skip',
  total_rows      INTEGER      NOT NULL DEFAULT 0,
  success_rows    INTEGER      NOT NULL DEFAULT 0,
  skipped_rows    INTEGER      NOT NULL DEFAULT 0,
  failed_rows     INTEGER      NOT NULL DEFAULT 0,
  status          VARCHAR(16)  NOT NULL DEFAULT 'pending',
  errors          JSONB        NOT NULL DEFAULT '[]'::jsonb,
  command_id      VARCHAR(64),
  created_by      VARCHAR(64)  NOT NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_import_kind CHECK (kind IN ('catalog', 'staff', 'movie')),
  CONSTRAINT ck_import_mode CHECK (mode IN ('validate', 'apply')),
  CONSTRAINT ck_import_conflict CHECK (conflict_policy IN ('skip', 'update', 'abort')),
  CONSTRAINT ck_import_status CHECK (status IN ('pending', 'validating', 'applying', 'completed', 'partial', 'failed', 'aborted')),
  CONSTRAINT uq_import_file UNIQUE (tenant_id, store_id, file_checksum)
);

COMMENT ON TABLE import_job IS 'PC 批量导入任务：同文件重复导入 0 重复（checksum 幂等）；逐行结果入 errors（09 §2.1）';
COMMENT ON COLUMN import_job.errors IS '[{rowNo, entity, code, message}] 逐行错误/跳过明细';

DROP TRIGGER IF EXISTS trg_import_job_updated_at ON import_job;
CREATE TRIGGER trg_import_job_updated_at
BEFORE UPDATE ON import_job
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. bill_adjustment：账单更正审计（command.bill.correct 的落账与前后快照；09 §2.3）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bill_adjustment (
  id                 VARCHAR(64) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  bill_id            VARCHAR(64) NOT NULL,
  operation          VARCHAR(32) NOT NULL,
  batch_id           VARCHAR(64),
  reason             VARCHAR(255) NOT NULL,
  approval_id        VARCHAR(64),
  operator_id        VARCHAR(64) NOT NULL,
  command_id         VARCHAR(64) NOT NULL,
  before_snapshot    JSONB        NOT NULL,
  after_snapshot     JSONB,
  amount_delta_cents BIGINT       NOT NULL DEFAULT 0,
  applied_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_adjust_operation
    CHECK (operation IN ('update', 'delete', 'batch_delete', 'keep_room_package_only'))
);

CREATE INDEX IF NOT EXISTS idx_bill_adjustment_bill ON bill_adjustment (tenant_id, store_id, bill_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bill_adjustment_batch ON bill_adjustment (batch_id);

COMMENT ON TABLE bill_adjustment IS '账单更正审计：高危操作必带原因/审批/前后快照；金额勾稽以 amount_delta_cents 追溯（09 §2.3）';

DROP TRIGGER IF EXISTS trg_bill_adjustment_updated_at ON bill_adjustment;
CREATE TRIGGER trg_bill_adjustment_updated_at
BEFORE UPDATE ON bill_adjustment
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. field_owner：字段级归属登记（02 §7.3；运营事件投影与命令校验的依据）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS field_owner (
  id            VARCHAR(64) PRIMARY KEY,
  table_name    VARCHAR(96)  NOT NULL,
  column_name   VARCHAR(96)  NOT NULL DEFAULT '*',
  domain        VARCHAR(64)  NOT NULL,
  level         VARCHAR(8)   NOT NULL,
  first_writer  VARCHAR(16)  NOT NULL,
  direction     VARCHAR(16)  NOT NULL,
  note          VARCHAR(255),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_owner_level CHECK (level IN ('C', 'S', 'T', 'R')),
  CONSTRAINT ck_owner_writer CHECK (first_writer IN ('app', 'cms')),
  CONSTRAINT ck_owner_direction CHECK (direction IN ('cms_to_app', 'app_to_cms', 'internal')),
  CONSTRAINT uq_field_owner UNIQUE (table_name, column_name)
);

COMMENT ON TABLE field_owner IS '字段 owner 登记：C=中央配置 / S=门店运营 / T=交易 / R=报表投影（02 §2、§7.3）';

-- 种子：W2-B/C/D 批次表级归属（列级 '*' 表示整表默认；后续按 04 字典细化）
INSERT INTO field_owner (id, table_name, column_name, domain, level, first_writer, direction, note) VALUES
  ('fo_settings_01',  'operational_settings',         '*', 'settings',   'S', 'app', 'app_to_cms', '门店设置 10 子模块按 domain 存储'),
  ('fo_cashier_01',   'operational_cashier',          '*', 'device',     'S', 'app', 'app_to_cms', '收银机'),
  ('fo_printer_01',   'operational_printer',          '*', 'device',     'S', 'app', 'app_to_cms', '打印机'),
  ('fo_printrule_01', 'operational_print_rule',       '*', 'device',     'S', 'app', 'app_to_cms', '打印规则'),
  ('fo_vod_01',       'operational_vod_config',       '*', 'vod',        'S', 'app', 'app_to_cms', 'VOD 在线设置'),
  ('fo_rotation_01',  'operational_vod_rotation_rule','*', 'vod',        'S', 'app', 'app_to_cms', '轮播歌曲'),
  ('fo_roomparam_01', 'operational_room_param',       '*', 'settings',   'S', 'app', 'app_to_cms', '包厢参数'),
  ('fo_movie_01',     'operational_movie',            '*', 'vod',        'S', 'app', 'app_to_cms', '影片管理'),
  ('fo_moviecat_01',  'operational_movie_category',   '*', 'vod',        'S', 'app', 'app_to_cms', '影片分类'),
  ('fo_deprule_01',   'operational_deposit_rule',     '*', 'deposit',    'S', 'app', 'app_to_cms', '寄存设置'),
  ('fo_rounding_01',  'operational_rounding_rule',    '*', 'pricing',    'S', 'app', 'app_to_cms', '抹零/抹零2（scope 区分）'),
  ('fo_marquee_01',   'operational_marquee_setting',  '*', 'settings',   'S', 'app', 'app_to_cms', '走马灯'),
  ('fo_artistset_01', 'operational_artist_setting',   '*', 'artist',     'S', 'app', 'app_to_cms', '艺人设置 7 项（App 写、CMS 投影）'),
  ('fo_product_01',   'operational_product',          '*', 'product',    'S', 'app', 'app_to_cms', '商品列表'),
  ('fo_prodcat_01',   'operational_product_category', '*', 'product',    'S', 'app', 'app_to_cms', '商品类型'),
  ('fo_prodflv_01',   'operational_product_flavor',   '*', 'product',    'S', 'app', 'app_to_cms', '商品口味'),
  ('fo_pkg_01',       'operational_product_package',  '*', 'product',    'S', 'app', 'app_to_cms', '商品套餐'),
  ('fo_rpkg_01',      'operational_room_package',     '*', 'pricing',    'S', 'app', 'app_to_cms', '开房套餐名称'),
  ('fo_rpkgpr_01',    'operational_room_package_price','*','pricing',    'S', 'app', 'app_to_cms', '开房套餐价格'),
  ('fo_timerule_01',  'operational_time_rule',        '*', 'pricing',    'S', 'app', 'app_to_cms', '计时/包断'),
  ('fo_prule_01',     'operational_pricing_rule',     '*', 'pricing',    'S', 'app', 'app_to_cms', '低消/不满 1 小时'),
  ('fo_deliv_01',     'operational_delivery_rule',    '*', 'delivery',   'S', 'app', 'app_to_cms', '商品配送'),
  ('fo_snack_01',     'operational_room_snack_rule',  '*', 'delivery',   'S', 'app', 'app_to_cms', '开房小吃'),
  ('fo_prstrat_01',   'operational_price_strategy',   '*', 'pricing',    'S', 'app', 'app_to_cms', '价格策略'),
  ('fo_points_01',    'operational_points_exchange_rule','*','points',   'S', 'app', 'app_to_cms', '积分兑换'),
  ('fo_wh_01',        'operational_warehouse',        '*', 'warehouse',  'S', 'app', 'app_to_cms', '仓库（主数据）'),
  ('fo_whrule_01',    'operational_warehouse_rule',   '*', 'warehouse',  'S', 'app', 'app_to_cms', '出货仓规则（主数据）'),
  ('fo_supplier_01',  'operational_supplier',         '*', 'warehouse',  'S', 'app', 'app_to_cms', '供应商（主数据）'),
  ('fo_stockpol_01',  'operational_stock_policy',     '*', 'warehouse',  'S', 'app', 'app_to_cms', '库存不足是否出货（规则）'),
  ('fo_stock_01',     'operational_stock',            '*', 'inventory',  'S', 'app', 'app_to_cms', '实时库存（App 写，PC 只读）'),
  ('fo_deposit_01',   'operational_deposit',          '*', 'deposit',    'T', 'app', 'app_to_cms', '寄存管理（交易事实）'),
  ('fo_pur_01',       'operational_purchase_order',   '*', 'inventory',  'S', 'app', 'app_to_cms', '采购进货（单据）'),
  ('fo_purret_01',    'operational_purchase_return',  '*', 'inventory',  'S', 'app', 'app_to_cms', '采购退货（单据）'),
  ('fo_transfer_01',  'operational_stock_transfer',   '*', 'inventory',  'S', 'app', 'app_to_cms', '库存调拨（单据）'),
  ('fo_damage_01',    'operational_stock_damage',     '*', 'inventory',  'S', 'app', 'app_to_cms', '报损单（单据）'),
  ('fo_req_01',       'operational_stock_requisition','*', 'inventory',  'S', 'app', 'app_to_cms', '领用单（单据）'),
  ('fo_count_01',     'operational_stock_count',      '*', 'inventory',  'S', 'app', 'app_to_cms', '库存盘点（单据）'),
  ('fo_billadj_01',   'bill_adjustment',              '*', 'bill',       'T', 'cms', 'cms_to_app', '账单更正：App 应用命令后回传，此处仅审计')
ON CONFLICT (table_name, column_name) DO NOTHING;

COMMIT;
