-- ============================================================================
-- 迭代补丁：price_override_audit 审计表（04 §4 价格覆写审计三元组）
-- 依据：02 §6.2 price.override 命令；App 回执事件 payload 携带 override* 三元组，
--       CMS ingest 时除常规投影外落审计行（与普通改价区分审计口径）。
-- 幂等：可重复执行。执行：psql "$DATABASE_URL" -f scripts/migrations/20261102_price_override_audit.pg.sql
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.price_override_audit (
  id                   VARCHAR(64) PRIMARY KEY,
  tenant_id            VARCHAR(36) NOT NULL,
  store_id             VARCHAR(36) NOT NULL,
  product_id           VARCHAR(64) NOT NULL,
  override_cents       BIGINT      NOT NULL,
  override_reason      VARCHAR(255) NOT NULL,
  override_operator_id VARCHAR(64) NOT NULL,
  record_version       BIGINT      NOT NULL,
  command_id           VARCHAR(64),
  source_event_id      VARCHAR(64),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ck_override_cents CHECK (override_cents >= 0)
);

CREATE INDEX IF NOT EXISTS idx_poa_store_product
  ON public.price_override_audit (tenant_id, store_id, product_id, created_at DESC);

COMMENT ON TABLE public.price_override_audit IS '价格覆写审计（04 §4 override* 三元组）：普通改价无此行，审计报表按本表筛选';
COMMENT ON COLUMN public.price_override_audit.override_reason IS '覆写原因（必填，与普通改价区分的核心口径）';

COMMIT;
