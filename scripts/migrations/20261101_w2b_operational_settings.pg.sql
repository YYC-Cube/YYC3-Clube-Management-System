-- ============================================================================
-- W2-B 运营投影·设置 10 子模块 + 艺人设置（13 表）
-- 依据：协同规范 08 §3.6、09 §5.2；手册「设置」模块全覆盖
-- 投影表通用列（09 §5.2 验收）：
--   id / tenant_id / store_id / record_version / source_event_id / source_command_id
--   / payload(JSONB 事实快照) / created_at / updated_at
-- 幂等：PK=id（App 聚合 ID）；投影仅接受 record_version 递增（02 §9、03 §5.2）
-- 执行：psql "$DATABASE_URL" -f scripts/migrations/20261101_w2b_operational_settings.pg.sql
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. operational_settings：门店设置/寄存/抹零/走马灯等按 domain 聚合（settings.update domain 对齐）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_settings (
  id                 VARCHAR(36) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  domain             VARCHAR(48) NOT NULL,
  enabled            BOOLEAN,
  config             JSONB       NOT NULL DEFAULT '{}'::jsonb,
  record_version     BIGINT      NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB       NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_settings_store_domain UNIQUE (tenant_id, store_id, domain),
  CONSTRAINT ck_settings_domain CHECK (domain IN
    ('store_settings', 'deposit_rule', 'rounding_rule', 'marquee', 'booking', 'payment', 'print', 'task'))
);

CREATE INDEX IF NOT EXISTS idx_settings_store ON operational_settings (tenant_id, store_id, domain);

COMMENT ON TABLE operational_settings IS '门店设置域投影：PC settings.update 按 domain 拆分（09 §4.3）；同一 domain 单行聚合';

DROP TRIGGER IF EXISTS trg_op_settings_updated_at ON operational_settings;
CREATE TRIGGER trg_op_settings_updated_at
BEFORE UPDATE ON operational_settings
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. operational_cashier：收银机
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_cashier (
  id                 VARCHAR(36) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  name               VARCHAR(96) NOT NULL,
  code               VARCHAR(48),
  status             VARCHAR(16) NOT NULL DEFAULT 'active',
  config             JSONB       NOT NULL DEFAULT '{}'::jsonb,
  record_version     BIGINT      NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB       NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_cashier_status CHECK (status IN ('active', 'inactive', 'offline'))
);

COMMENT ON TABLE operational_cashier IS '收银机投影（master.device.* deviceType=cashier）';

DROP TRIGGER IF EXISTS trg_op_cashier_updated_at ON operational_cashier;
CREATE TRIGGER trg_op_cashier_updated_at
BEFORE UPDATE ON operational_cashier
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. operational_printer：打印机
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_printer (
  id                 VARCHAR(36) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  name               VARCHAR(96) NOT NULL,
  device_type        VARCHAR(24) NOT NULL DEFAULT 'printer',
  status             VARCHAR(16) NOT NULL DEFAULT 'active',
  config             JSONB       NOT NULL DEFAULT '{}'::jsonb,
  record_version     BIGINT      NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB       NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_printer_status CHECK (status IN ('active', 'inactive', 'offline')),
  CONSTRAINT ck_printer_type CHECK (device_type IN ('printer', 'kitchen_printer', 'bill_printer', 'label_printer'))
);

COMMENT ON TABLE operational_printer IS '打印机投影（master.device.* deviceType=printer/*）';

DROP TRIGGER IF EXISTS trg_op_printer_updated_at ON operational_printer;
CREATE TRIGGER trg_op_printer_updated_at
BEFORE UPDATE ON operational_printer
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. operational_print_rule：打印规则（打单单据类型/联数/指向打印机）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_print_rule (
  id                 VARCHAR(36) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  name               VARCHAR(96) NOT NULL,
  scene              VARCHAR(32) NOT NULL,
  printer_id         VARCHAR(36),
  copies             SMALLINT    NOT NULL DEFAULT 1,
  enabled            BOOLEAN     NOT NULL DEFAULT TRUE,
  config             JSONB       NOT NULL DEFAULT '{}'::jsonb,
  record_version     BIGINT      NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB       NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_print_scene CHECK (scene IN ('bill', 'order', 'kitchen', 'handover', 'deposit', 'label'))
);

COMMENT ON TABLE operational_print_rule IS '打印规则投影（master.print.updated）';

DROP TRIGGER IF EXISTS trg_op_printrule_updated_at ON operational_print_rule;
CREATE TRIGGER trg_op_printrule_updated_at
BEFORE UPDATE ON operational_print_rule
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. operational_vod_config：VOD 在线设置（大厅公视/智能灯光/开房播放/开机播放）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_vod_config (
  id                 VARCHAR(36) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  domain             VARCHAR(24) NOT NULL DEFAULT 'config',
  enabled            BOOLEAN     NOT NULL DEFAULT TRUE,
  config             JSONB       NOT NULL DEFAULT '{}'::jsonb,
  record_version     BIGINT      NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB       NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_vod_config UNIQUE (tenant_id, store_id, domain),
  CONSTRAINT ck_vod_domain CHECK (domain IN ('config', 'hall_tv', 'smart_light', 'room_play', 'boot_play'))
);

COMMENT ON TABLE operational_vod_config IS 'VOD 在线设置投影（command.vod.update domain=config/hall_tv/...；09 §4.3）';

DROP TRIGGER IF EXISTS trg_op_vodcfg_updated_at ON operational_vod_config;
CREATE TRIGGER trg_op_vodcfg_updated_at
BEFORE UPDATE ON operational_vod_config
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 6. operational_vod_rotation_rule：轮播歌曲
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_vod_rotation_rule (
  id                 VARCHAR(36) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  name               VARCHAR(96) NOT NULL,
  playlist           JSONB       NOT NULL DEFAULT '[]'::jsonb,
  effective_from     TIMESTAMPTZ,
  effective_to       TIMESTAMPTZ,
  enabled            BOOLEAN     NOT NULL DEFAULT TRUE,
  record_version     BIGINT      NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB       NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE operational_vod_rotation_rule IS '轮播歌曲投影（command.vod.update domain=rotation）；playlist 仅存曲目引用（08 §5 禁大对象）';

DROP TRIGGER IF EXISTS trg_op_vodrot_updated_at ON operational_vod_rotation_rule;
CREATE TRIGGER trg_op_vodrot_updated_at
BEFORE UPDATE ON operational_vod_rotation_rule
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 7. operational_room_param：包厢参数（VOD 包厢配置）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_room_param (
  id                 VARCHAR(36) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  room_type_id       VARCHAR(36),
  params             JSONB       NOT NULL DEFAULT '{}'::jsonb,
  record_version     BIGINT      NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB       NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_op_roomparam_store ON operational_room_param (tenant_id, store_id, room_type_id);

COMMENT ON TABLE operational_room_param IS '包厢参数投影（command.vod.update domain=room_param）';

DROP TRIGGER IF EXISTS trg_op_roomparam_updated_at ON operational_room_param;
CREATE TRIGGER trg_op_roomparam_updated_at
BEFORE UPDATE ON operational_room_param
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 8. operational_movie：影片管理（movie.import 批量 + record.upsert 单条）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_movie (
  id                 VARCHAR(36) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  title              VARCHAR(192) NOT NULL,
  category_id        VARCHAR(36),
  media_ref          VARCHAR(512),
  cover_ref          VARCHAR(512),
  duration_seconds   INTEGER,
  status             VARCHAR(16) NOT NULL DEFAULT 'active',
  sort_order         INTEGER     NOT NULL DEFAULT 0,
  record_version     BIGINT      NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB       NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_movie_status CHECK (status IN ('active', 'inactive', 'deleted'))
);

CREATE INDEX IF NOT EXISTS idx_op_movie_store ON operational_movie (tenant_id, store_id, status, sort_order);

COMMENT ON TABLE operational_movie IS '影片投影：media/cover 只存对象存储引用，不入库存大对象（command.movie.import；09 §3-3）';

DROP TRIGGER IF EXISTS trg_op_movie_updated_at ON operational_movie;
CREATE TRIGGER trg_op_movie_updated_at
BEFORE UPDATE ON operational_movie
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 9. operational_movie_category：影片分类
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_movie_category (
  id                 VARCHAR(36) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  name               VARCHAR(96) NOT NULL,
  sort_order         INTEGER     NOT NULL DEFAULT 0,
  status             VARCHAR(16) NOT NULL DEFAULT 'active',
  record_version     BIGINT      NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB       NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_movie_category UNIQUE (tenant_id, store_id, name)
);

COMMENT ON TABLE operational_movie_category IS '影片分类投影（master.movie.*）';

DROP TRIGGER IF EXISTS trg_op_moviecat_updated_at ON operational_movie_category;
CREATE TRIGGER trg_op_moviecat_updated_at
BEFORE UPDATE ON operational_movie_category
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 10. operational_deposit_rule：寄存设置（存酒上限/期限/充公规则）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_deposit_rule (
  id                 VARCHAR(36) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  name               VARCHAR(96) NOT NULL DEFAULT 'default',
  max_items          INTEGER,
  retain_days        INTEGER,
  confiscate_policy  VARCHAR(24),
  config             JSONB       NOT NULL DEFAULT '{}'::jsonb,
  record_version     BIGINT      NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB       NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_confiscate_policy CHECK (confiscate_policy IN ('keep', 'confiscate', 'notify'))
);

COMMENT ON TABLE operational_deposit_rule IS '寄存设置投影（settings.update domain=deposit_rule）';

DROP TRIGGER IF EXISTS trg_op_deprule_updated_at ON operational_deposit_rule;
CREATE TRIGGER trg_op_deprule_updated_at
BEFORE UPDATE ON operational_deposit_rule
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 11. operational_rounding_rule：抹零/抹零2（scope=area/order/bill；手册「抹零设置2」）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_rounding_rule (
  id                 VARCHAR(36) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  scope              VARCHAR(16) NOT NULL,
  mode               VARCHAR(16) NOT NULL DEFAULT 'none',
  round_to_cents     BIGINT      NOT NULL DEFAULT 1,
  enabled            BOOLEAN     NOT NULL DEFAULT TRUE,
  config             JSONB       NOT NULL DEFAULT '{}'::jsonb,
  record_version     BIGINT      NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB       NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_rounding UNIQUE (tenant_id, store_id, scope),
  CONSTRAINT ck_rounding_scope CHECK (scope IN ('area', 'order', 'bill')),
  CONSTRAINT ck_rounding_mode CHECK (mode IN ('none', 'nearest', 'up', 'down', 'custom'))
);

COMMENT ON TABLE operational_rounding_rule IS '抹零设置投影（settings.update domain=rounding_rule,scope=...；09 §4.3-9）';

DROP TRIGGER IF EXISTS trg_op_rounding_updated_at ON operational_rounding_rule;
CREATE TRIGGER trg_op_rounding_updated_at
BEFORE UPDATE ON operational_rounding_rule
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 12. operational_marquee_setting：走马灯
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_marquee_setting (
  id                 VARCHAR(36) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  content            VARCHAR(1024) NOT NULL DEFAULT '',
  schedule           JSONB        NOT NULL DEFAULT '{}'::jsonb,
  enabled            BOOLEAN      NOT NULL DEFAULT TRUE,
  record_version     BIGINT       NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB        NOT NULL,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_marquee UNIQUE (tenant_id, store_id)
);

COMMENT ON TABLE operational_marquee_setting IS '走马灯投影（settings.update domain=marquee）';

DROP TRIGGER IF EXISTS trg_op_marquee_updated_at ON operational_marquee_setting;
CREATE TRIGGER trg_op_marquee_updated_at
BEFORE UPDATE ON operational_marquee_setting
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

-- ----------------------------------------------------------------------------
-- 13. operational_artist_setting：艺人设置 7 项/13 子项（App 写、CMS 投影；10 号规范 v1.3.0）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operational_artist_setting (
  id                 VARCHAR(36) PRIMARY KEY,
  tenant_id          VARCHAR(36) NOT NULL,
  store_id           VARCHAR(36) NOT NULL,
  item_key           VARCHAR(64) NOT NULL,
  value              JSONB       NOT NULL,
  enabled            BOOLEAN,
  record_version     BIGINT      NOT NULL,
  source_event_id    VARCHAR(64),
  source_command_id  VARCHAR(64),
  payload            JSONB       NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_artist_setting UNIQUE (tenant_id, store_id, item_key)
);

COMMENT ON TABLE operational_artist_setting IS '艺人设置投影：第一写入方为 App（master.artist_setting.*）；PC 可写走 command.artist_setting.update 后由 App 事件回投影（09 §6-2/3 已裁定）';

DROP TRIGGER IF EXISTS trg_op_artistset_updated_at ON operational_artist_setting;
CREATE TRIGGER trg_op_artistset_updated_at
BEFORE UPDATE ON operational_artist_setting
FOR EACH ROW EXECUTE FUNCTION yyc3_set_updated_at();

COMMIT;
