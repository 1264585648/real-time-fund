/**
 * 记录每次调用基金估值接口的结果，用于分时图。
 * 规则：获取到最新日期的数据时，清掉所有老日期的数据，只保留当日分时点。
 */
import { isPlainObject, isString } from 'lodash';

const STORAGE_KEY = 'fundValuationTimeseries';

function getStored() {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return isPlainObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function setStored(data) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('valuationTimeseries persist failed', e);
  }
}

/**
 * 从 gztime 或 Date 得到日期字符串 YYYY-MM-DD
 */
function toDateStr(gztimeOrNow) {
  if (isString(gztimeOrNow) && /^\d{4}-\d{2}-\d{2}/.test(gztimeOrNow)) {
    return gztimeOrNow.slice(0, 10);
  }
  try {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return null;
  }
}

/**
 * 记录一条估值。仅当 value 为有效数字时写入。
 * 数据清理：若当前点所属日期大于已存点的最大日期，则清空该基金下所有旧日期的数据，只保留当日分时。
 *
 * @param {string} code - 基金代码
 * @param {{ gsz?: number | null, gztime?: string | null }} payload - 估值与时间（来自接口）
 * @returns {Array<{ time: string, value: number, date: string }>} 该基金当前分时序列（按时间升序）
 */
export function recordValuation(code, payload) {
  const value = payload?.gsz != null ? Number(payload.gsz) : NaN;
  if (!Number.isFinite(value)) return getValuationSeries(code);

  const gztime = payload?.gztime ?? null;
  const dateStr = toDateStr(gztime);
  if (!dateStr) return getValuationSeries(code);

  const timeLabel = isString(gztime) && gztime.length > 10
    ? gztime.slice(11, 16)
    : (() => {
        const d = new Date();
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      })();

  const newPoint = { time: timeLabel, value, date: dateStr };

  const all = getStored();
  const list = Array.isArray(all[code]) ? all[code] : [];

  const existingDates = list.map((p) => p.date).filter(Boolean);
  const latestStoredDate = existingDates.length ? existingDates.reduce((a, b) => (a > b ? a : b), '') : '';

  let nextList;
  if (dateStr > latestStoredDate) {
    nextList = [newPoint];
  } else if (dateStr === latestStoredDate) {
    const hasSameTime = list.some((p) => p.time === timeLabel);
    if (hasSameTime) return list;
    nextList = [...list, newPoint];
  } else {
    return list;
  }

  all[code] = nextList;
  setStored(all);
  return nextList;
}

/**
 * 获取某基金的分时序列（只读）
 * @param {string} code - 基金代码
 * @returns {Array<{ time: string, value: number, date: string }>}
 */
export function getValuationSeries(code) {
  const all = getStored();
  const list = Array.isArray(all[code]) ? all[code] : [];
  return list;
}

/**
 * 删除某基金的全部分时数据（如用户删除该基金时调用）
 * @param {string} code - 基金代码
 */
export function clearFund(code) {
  const all = getStored();
  if (!(code in all)) return;
  const next = { ...all };
  delete next[code];
  setStored(next);
}

/**
 * 获取全部分时数据，用于页面初始 state
 * @returns {{ [code: string]: Array<{ time: string, value: number, date: string }> }}
 */
export function getAllValuationSeries() {
  return getStored();
}
