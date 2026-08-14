'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchFundData, fetchFundBatch } from '../lib/fundApi';
import { syncService, DATA_KEYS } from '../lib/syncService';

// 按 code 去重，保留第一次出现的项，避免列表重复
const dedupeByCode = (list) => {
  const seen = new Set();
  return list.filter((f) => {
    const c = f?.code;
    if (!c || seen.has(c)) return false;
    seen.add(c);
    return true;
  });
};

export const useFunds = () => {
  const [funds, setFunds] = useState([]);
  const [refreshMs, setRefreshMs] = useState(30000);
  const [refreshing, setRefreshing] = useState(false);
  const [positions, setPositions] = useState({});
  // 首次访问时从 initial-holdings.json 自动导入持仓（按金额计算份额）
  const [pendingInitialHoldings, setPendingInitialHoldings] = useState(null);

  const timerRef = useRef(null);
  const refreshingRef = useRef(false);

  const refreshAll = useCallback(
    async (codes) => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      setRefreshing(true);
      const uniqueCodes = Array.from(new Set(codes));
      try {
        // Phase 1: 批量获取所有基金的估值/净值（单次 POST，~145ms/53只）
        const batchMap = await fetchFundBatch(uniqueCodes);

        // Phase 2: 用批量数据快速更新基础信息（估值/净值/名称）
        const batchUpdated = [];
        for (const c of uniqueCodes) {
          const bv = batchMap.get(c);
          if (bv) {
            batchUpdated.push(bv);
          } else {
            // 批量接口无此基金，保留旧数据
            setFunds((prev) => {
              const old = prev.find((f) => f.code === c);
              if (old) batchUpdated.push(old);
              return prev;
            });
          }
        }

        if (batchUpdated.length > 0) {
          setFunds((prev) => {
            const merged = [...prev];
            batchUpdated.forEach((u) => {
              const idx = merged.findIndex((f) => f.code === u.code);
              if (idx > -1) { merged[idx] = u; } else { merged.push(u); }
            });
            const deduped = dedupeByCode(merged);
            syncService.save(DATA_KEYS.FUNDS, deduped);
            return deduped;
          });
        }

        // Phase 3: 并行获取每只基金的详细信息（持仓、历史走势）
        // 仅在需要展示详情时才请求，避免拖慢主流程
        const detailPromises = uniqueCodes.map(async (c) => {
          try {
            return await fetchFundData(c);
          } catch (e) {
            console.error(`刷新基金 ${c} 详情失败`, e);
            return null;
          }
        });

        const details = await Promise.allSettled(detailPromises);
        const detailUpdated = details
          .filter((r) => r.status === 'fulfilled' && r.value)
          .map((r) => r.value);

        if (detailUpdated.length > 0) {
          setFunds((prev) => {
            const merged = [...prev];
            detailUpdated.forEach((u) => {
              const idx = merged.findIndex((f) => f.code === u.code);
              if (idx > -1) { merged[idx] = u; } else { merged.push(u); }
            });
            const deduped = dedupeByCode(merged);
            syncService.save(DATA_KEYS.FUNDS, deduped);
            return deduped;
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        refreshingRef.current = false;
        setRefreshing(false);
      }
    },
    []
  );

  // 初始化：从本地/云端读取基金列表、刷新频率和持仓，并触发一次刷新
  useEffect(() => {
    const loadData = async () => {
      try {
        // 从同步服务加载数据（会尝试从云端同步）
        const saved = await syncService.load(DATA_KEYS.FUNDS, []);
        if (Array.isArray(saved) && saved.length) {
          // 有历史数据：正常加载
          const deduped = dedupeByCode(saved);
          setFunds(deduped);
          const codes = Array.from(new Set(deduped.map((f) => f.code)));
          if (codes.length) refreshAll(codes);
        } else {
          // 首次访问：尝试从 initial-holdings.json 导入初始持仓
          try {
            // 使用相对路径：生产环境部署在 /fund 子路径下，
            // 绝对路径 /initial-holdings.json 会落到根站点到 404。
            const res = await fetch('initial-holdings.json');
            if (res.ok) {
              const initData = await res.json();
              if (initData?.holdings?.length) {
                setPendingInitialHoldings(initData.holdings);
                const codes = initData.holdings.map((h) => h.code);
                // 先用占位数据让 refreshAll 去拉取真实基金信息
                const placeholderFunds = codes.map((c) => ({ code: c, name: '' }));
                setFunds(placeholderFunds);
                refreshAll(codes);
              }
            }
          } catch (e) {
            console.log('未找到初始持仓文件，以空白状态启动');
          }
        }
        
        const savedMs = await syncService.load(DATA_KEYS.REFRESH_MS, 30000);
        if (Number.isFinite(savedMs) && savedMs >= 5000) {
          setRefreshMs(savedMs);
        }
        
        // 加载持仓信息
        const savedPositions = await syncService.load(DATA_KEYS.POSITIONS, {});
        if (savedPositions && typeof savedPositions === 'object') {
          setPositions(savedPositions);
        }
      } catch {
        // ignore
      }
    };
    
    loadData();
  }, [refreshAll]);

  // 定时刷新
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const codes = Array.from(new Set(funds.map((f) => f.code)));
      if (codes.length) refreshAll(codes);
    }, refreshMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [funds, refreshMs, refreshAll]);

  // 首次导入：当 initial-holdings.json 中的基金全部拉取到实时净值后，
  // 按"持有金额 ÷ 单位净值"自动计算份额并写入持仓
  useEffect(() => {
    if (!pendingInitialHoldings || !funds.length) return;
    // 检查是否所有基金都已获取到有效净值（dwjz）
    const allReady = pendingInitialHoldings.every((h) => {
      const f = funds.find((item) => item.code === h.code);
      return f && Number.isFinite(Number(f.dwjz)) && Number(f.dwjz) > 0;
    });
    if (!allReady) return; // 等待 refreshAll 全部完成
    const newPositions = {};
    for (const h of pendingInitialHoldings) {
      const fund = funds.find((f) => f.code === h.code);
      if (!fund || !Number.isFinite(Number(fund.dwjz)) || Number(fund.dwjz) <= 0) continue;
      const nav = Number(fund.dwjz);
      const shares = h.amount / nav;
      // 根据持有收益率反推成本价（如有），否则用当前净值作为成本
      let totalCost, costPrice;
      if (h.returnRate != null && h.returnRate !== 0 && h.returnRate !== -1) {
        // 持有金额 = 成本 × (1 + 收益率) → 成本 = 金额 / (1 + 收益率)
        totalCost = h.amount / (1 + h.returnRate);
        costPrice = totalCost / shares;
      } else {
        totalCost = h.amount;
        costPrice = nav;
      }
      newPositions[h.code] = {
        shares,
        costPrice,
        totalCost,
        lastTradeDate: null,
        lastTradeNav: nav,
      };
    }
    setPositions(newPositions);
    syncService.save(DATA_KEYS.POSITIONS, newPositions);
    setPendingInitialHoldings(null); // 仅执行一次
  }, [funds, pendingInitialHoldings]);

  const manualRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    const codes = Array.from(new Set(funds.map((f) => f.code)));
    if (!codes.length) return;
    await refreshAll(codes);
  }, [funds, refreshAll]);

  const updateRefreshMs = useCallback((ms) => {
    setRefreshMs(ms);
    syncService.save(DATA_KEYS.REFRESH_MS, ms);
  }, []);

  return {
    funds,
    setFunds,
    refreshMs,
    updateRefreshMs,
    refreshing,
    manualRefresh,
    refreshAll,
    positions,
    setPositions,
    dedupeByCode,
  };
};


