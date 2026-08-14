'use client';

/**
 * 通用 script 加载器（JSONP 等场景）
 * @param {string} url
 * @returns {Promise<void>}
 */
export const loadScript = (url) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.onload = () => {
      if (document.body.contains(script)) document.body.removeChild(script);
      resolve();
    };
    script.onerror = () => {
      if (document.body.contains(script)) document.body.removeChild(script);
      reject(new Error('数据加载失败'));
    };
    document.body.appendChild(script);
  });
};

/**
 * 根据股票代码推断腾讯接口前缀
 * @param {string} code
 * @returns {'sh' | 'sz' | 'bj'}
 */
const getTencentPrefix = (code) => {
  if (code.startsWith('6') || code.startsWith('9')) return 'sh';
  if (code.startsWith('0') || code.startsWith('3')) return 'sz';
  if (code.startsWith('4') || code.startsWith('8')) return 'bj';
  return 'sz';
};

// ===== 新估值接口（替代已下线的 fundgz.1234567.com.cn）=====
//
// 背景：2026-02 起证监会要求三方平台下架盘中实时估值，
//       fundgz JSONP 接口返回 404 HTML。
//       替代方案：天天基金内部接口 FundValuationLast（CORS 开放，支持批量 POST）
//
// 字段说明：
//   FCODE     - 基金代码
//   SHORTNAME - 基金简称
//   GSZ       - 估算净值（盘中实时，部分基金可能为 null）
//   GSZZL     - 估算涨跌幅%（盘中实时，部分基金可能为 null）
//   GZTIME    - 估值时间
//   NAV       - 上一交易日单位净值（一定有值）
//   NAVCHGRT  - 实际涨跌幅%
//   PDATE     - 净值日期

const FV_ENDPOINTS = [
  'https://fundcomapi.tiantianfunds.com/mm/newCore/FundValuationLast',
  'https://fundcomapi.eastmoney.com/mm/newCore/FundValuationLast',
];
const FV_FIELDS = 'FCODE,SHORTNAME,GSZZL,GZTIME,GSZ,NAV,PDATE,NAVCHGRT';
const FV_TIMEOUT = 15000;

/** 安全转浮点数 */
const toFloat = (v) => {
  if (v == null || v === '' || v === '--') return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};

/**
 * 通过新接口批量获取基金估值（POST，CORS 开放）
 * @param {string[]} codes 基金代码数组
 * @returns {Promise<Map<string, object>>} code → 估值数据
 */
export const fetchFundBatch = async (codes) => {
  const map = new Map();
  if (!codes || !codes.length) return map;

  const body = `FCODES=${encodeURIComponent(codes.join(','))}&FIELDS=${encodeURIComponent(FV_FIELDS)}`;

  for (const url of FV_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FV_TIMEOUT);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
        body,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) continue;
      const j = await res.json();
      if (j.errorCode !== 0 || !Array.isArray(j.data)) continue;

      for (const item of j.data) {
        if (!item?.FCODE) continue;
        const hasGsz = item.GSZ != null && item.GSZ !== '' && item.GSZ !== '--';
        map.set(item.FCODE, {
          code: item.FCODE,
          name: item.SHORTNAME || '',
          dwjz: toFloat(item.NAV),
          gsz: hasGsz ? toFloat(item.GSZ) : toFloat(item.NAV),
          gztime: hasGsz ? (item.GZTIME || '') : '',
          gszzl: hasGsz ? toFloat(item.GSZZL) : toFloat(item.NAVCHGRT),
        });
      }
      // 填充缺失的 code
      for (const c of codes) { if (!map.has(c)) map.set(c, null); }
      return map; // 成功则直接返回
    } catch (e) {
      console.warn(`FV endpoint ${url} failed:`, e.message);
    }
  }
  // 所有端点失败
  for (const c of codes) map.set(c, null);
  return map;
};

/**
 * 获取单只基金的完整数据：估值 + 前十重仓 + 历史净值走势
 *
 * 策略：
 *   1. 先用 FundValuationLast 获取估值/净值（POST，快）
 *   2. 再用 pingzhongdata 获取历史走势（script 注入）
 *   3. 再抓前十重仓 + 重仓股涨跌
 *
 * @param {string} code 基金代码
 * @returns {Promise<object>} 统一数据结构
 */
export const fetchFundData = async (code) => {
  // 第一步：通过新接口获取估值/净值
  let gzData;
  try {
    const batchMap = await fetchFundBatch([code]);
    gzData = batchMap.get(code);
    if (!gzData) throw new Error('FV 接口无数据');
  } catch (e) {
    // 新接口完全失败时，尝试从 pingzhongdata 提取基本信息作为兜底
    console.warn(`基金 ${code} 估值接口失败，使用兜底方案:`, e.message);
    gzData = { code, name: '', dwjz: null, gsz: null, gztime: '', gszzl: null };
  }

  // 第二步：并行获取历史净值走势 和 前十重仓
  const [extraResult] = await Promise.allSettled([
    // 历史净值走势（pingzhongdata）
    (async () => {
      let historyTrend = [];
      let yesterdayChange = null;
      let fundNameFromPing = '';
      try {
        await loadScript(`https://fund.eastmoney.com/pingzhongdata/${code}.js?v=${Date.now()}`);
        const trend = Array.isArray(window.Data_netWorthTrend) ? window.Data_netWorthTrend : [];
        fundNameFromPing = window.fS_name || '';
        if (trend.length > 0) {
          const sliced = trend.slice(-90);
          historyTrend = sliced.map((item) => ({
            x: item.x, y: item.y, equityReturn: item.equityReturn,
          }));
          for (let i = sliced.length - 1; i >= 0; i--) {
            const p = sliced[i];
            if (p && typeof p.equityReturn === 'number' && Number.isFinite(p.equityReturn)) {
              yesterdayChange = p.equityReturn;
              break;
            }
          }
        }
      } catch (e) {
        console.error('获取历史净值走势失败', e);
      }
      return { historyTrend, yesterdayChange, fundNameFromPing };
    })(),

    // 前十重仓股票列表 + 涨跌幅
    (async () => {
      let holdings = [];
      try {
        await loadScript(`https://fundf10.eastmoney.com/FundArchivesDatas.aspx?type=jjcc&code=${code}&topline=10&year=&month=&rt=${Date.now()}`);
        const html = window.apidata?.content || '';
        const rows = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];
        for (const r of rows) {
          const cells = (r.match(/<td[\s\S]*?>([\s\S]*?)<\/td>/gi) || []).map((td) =>
            td.replace(/<[^>]*>/g, '').trim()
          );
          const codeIdx = cells.findIndex((txt) => /^\d{6}$/.test(txt));
          const weightIdx = cells.findIndex((txt) => /\d+(?:\.\d+)?\s*%/.test(txt));
          if (codeIdx >= 0 && weightIdx >= 0) {
            holdings.push({
              code: cells[codeIdx],
              name: cells[codeIdx + 1] || '',
              weight: cells[weightIdx],
              change: null,
            });
          }
        }
        holdings = holdings.slice(0, 10);

        // 补充重仓股当日涨跌幅（腾讯行情）
        if (holdings.length) {
          try {
            const tencentCodes = holdings.map((h) => `s_${getTencentPrefix(h.code)}${h.code}`).join(',');
            await new Promise((resQuote) => {
              const scriptQuote = document.createElement('script');
              scriptQuote.src = `https://qt.gtimg.cn/q=${tencentCodes}`;
              scriptQuote.onload = () => {
                holdings.forEach((h) => {
                  const dataStr = window[`v_s_${getTencentPrefix(h.code)}${h.code}`];
                  if (dataStr) {
                    const parts = dataStr.split('~');
                    if (parts.length > 5) h.change = parseFloat(parts[5]);
                  }
                });
                if (document.body.contains(scriptQuote)) document.body.removeChild(scriptQuote);
                resQuote();
              };
              scriptQuote.onerror = () => {
                if (document.body.contains(scriptQuote)) document.body.removeChild(scriptQuote);
                resQuote();
              };
              document.body.appendChild(scriptQuote);
            });
          } catch (e) {
            console.error('获取股票涨跌幅失败', e);
          }
        }
      } catch (e) {
        console.error('获取持仓数据失败', e);
      }
      return holdings;
    })(),
  ]);

  // 合并结果
  const extra = extraResult.status === 'fulfilled' ? extraResult.value : {};
  const holdingsResult = extraResult.status === 'fulfilled' ? extraResult[1] : [];

  // 如果新接口没返回名称，用 pingzhongdata 的名称补充
  if (!gzData.name && extra.fundNameFromPing) {
    gzData.name = extra.fundNameFromPing;
  }

  return {
    ...gzData,
    holdings: holdingsResult || [],
    historyTrend: extra.historyTrend || [],
    yesterdayChange: extra.yesterdayChange ?? null,
  };
};

/**
 * 基金搜索（名称 / 代码），使用东财 JSONP 接口
 * 仅返回"公募基金"类型的数据
 *
 * @param {string} keyword
 * @returns {Promise<any[]>}
 */
export const searchFunds = async (keyword) => {
  const val = String(keyword || '').trim();
  if (!val) return [];

  const callbackName = `SuggestData_${Date.now()}`;
  const url = `https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx?m=1&key=${encodeURIComponent(
    val
  )}&callback=${callbackName}&_=${Date.now()}`;

  try {
    const fundsOnly = await new Promise((resolve, reject) => {
      window[callbackName] = (data) => {
        let result = [];
        if (data && data.Datas) {
          result = data.Datas.filter(
            (d) =>
              d.CATEGORY === 700 ||
              d.CATEGORY === '700' ||
              d.CATEGORYDESC === '基金'
          );
        }
        delete window[callbackName];
        resolve(result);
      };

      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.onload = () => {
        if (document.body.contains(script)) document.body.removeChild(script);
      };
      script.onerror = () => {
        if (document.body.contains(script)) document.body.removeChild(script);
        delete window[callbackName];
        reject(new Error('搜索请求失败'));
      };
      document.body.appendChild(script);
    });

    return fundsOnly;
  } catch (e) {
    console.error('搜索失败', e);
    return [];
  }
};
