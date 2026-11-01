-- ============================================================================
-- W2 评审修正：主数据/规则/单据表补墓碑列（协同规范 09 附录 A-2）
-- 依据：04 §1「删除 = deleted=true + deletedAt，不物理删除主数据」
-- 范围：W2b/W2c/W2d 共 35 张（排除交易事实 operational_stock / operational_deposit）
-- 幂等：information_schema 列存在性检查，可重复执行
-- 执行：psql "$DATABASE_URL" -f scripts/migrations/20261102_w2_review_fixes.pg.sql
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0. 补列：operational_product.member_price_cents / stock（04 §4 正式字典字段；
--    首批评审误归「接受项」，投影实现需要标量列，予以补齐）
-- ----------------------------------------------------------------------------
ALTER TABLE public.operational_product
  ADD COLUMN IF NOT EXISTS member_price_cents BIGINT;
ALTER TABLE public.operational_product
  ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    -- W2-B 设置域
    'operational_settings','operational_cashier','operational_printer','operational_print_rule',
    'operational_vod_config','operational_vod_rotation_rule','operational_room_param',
    'operational_movie','operational_movie_category','operational_deposit_rule',
    'operational_rounding_rule','operational_marquee_setting','operational_artist_setting',
    -- W2-C 商品域
    'operational_product','operational_product_category','operational_product_flavor',
    'operational_product_package','operational_room_package','operational_room_package_price',
    'operational_time_rule','operational_pricing_rule','operational_delivery_rule',
    'operational_room_snack_rule','operational_price_strategy','operational_points_exchange_rule',
    -- W2-D 仓库域（主数据/规则/单据；不含 stock/deposit 交易事实）
    'operational_warehouse','operational_warehouse_rule','operational_supplier',
    'operational_stock_policy','operational_purchase_order','operational_purchase_return',
    'operational_stock_transfer','operational_stock_damage','operational_stock_requisition',
    'operational_stock_count'
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
      EXECUTE format(
        'COMMENT ON COLUMN public.%I.deleted IS ''墓碑：true=已删除（04 §1）；删除事件仍保留 payload 全量快照''',
        t);
    END IF;
  END LOOP;
END $$;

COMMIT;
