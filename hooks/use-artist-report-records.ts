"use client"

/**
 * @file use-artist-report-records.ts
 * @description 艺人报表数据 Hook — 首屏使用 Mock，挂载后切换为 API 数据
 * @module hooks
 * @author YYC³
 * @version 1.0.0
 * @created 2026-10-31
 *
 * 说明：
 * - API 未就绪/网络异常时保持 Mock，页面不会出现空白；
 * - API 返回空数组表示真实库无数据，页面如实展示空态；
 * - 过滤与聚合仍由 `lib/services/artist-report.ts` 统一处理，保证口径一致。
 */

import { useEffect, useState } from "react"
import {
  ARTIST_CLOCK_RECORDS,
  ARTIST_FEE_DEDUCTIONS,
  type ArtistClockRecord,
  type ArtistFeeDeductionRecord,
} from "@/lib/services/artist-report"
import {
  fetchArtistClockRecords,
  fetchArtistDeductionRecords,
} from "@/lib/services/artist-report-client"

export function useArtistClockRecords(): ArtistClockRecord[] {
  const [records, setRecords] = useState<ArtistClockRecord[]>(ARTIST_CLOCK_RECORDS)

  useEffect(() => {
    let cancelled = false

    fetchArtistClockRecords()
      .then(rows => {
        if (!cancelled && rows) setRecords(rows)
      })
      .catch(error => {
        console.warn("[artist-report] 上下钟 API 不可用，使用演示数据", error)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return records
}

export function useArtistDeductionRecords(): ArtistFeeDeductionRecord[] {
  const [records, setRecords] = useState<ArtistFeeDeductionRecord[]>(ARTIST_FEE_DEDUCTIONS)

  useEffect(() => {
    let cancelled = false

    fetchArtistDeductionRecords()
      .then(rows => {
        if (!cancelled && rows) setRecords(rows)
      })
      .catch(error => {
        console.warn("[artist-report] 扣款 API 不可用，使用演示数据", error)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return records
}
