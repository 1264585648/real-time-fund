# localStorage 数据结构说明

本文档详细说明了 real-time-fund 项目中使用的 localStorage 数据结构。

## 概述

项目使用 localStorage 来持久化用户的基金数据、配置和状态。所有数据都以 JSON 字符串格式存储（除简单字符串外）。

---

## 数据键列表

### 1. funds

**类型**: `Array<Object>`
**默认值**: `[]`
**说明**: 存储用户添加的所有基金信息
**云端同步**: 是

**数据结构**:
```javascript
[
  {
    code: string,      // 基金代码（唯一标识）
    name: string,      // 基金名称
    type: string,      // 基金类型
    dwjz: number,      // 单位净值
    gsz: number,       // 估算净值
    gszzl: number,     // 估算涨跌幅
    jzrq: string,      // 净值日期
    gztime: string,    // 估值时间
    // ... 其他基金字段
  }
]
```

**使用场景**:
- 页面加载时恢复基金列表
- 添加/删除基金时更新
- 导入/导出配置时包含
- 云端同步时同步

---

### 2. favorites

**类型**: `Array<string>`
**默认值**: `[]`
**说明**: 存储用户标记为自选的基金代码列表
**云端同步**: 是

**数据结构**:
```javascript
[
  "000001",  // 基金代码
  "110022",
  // ...
]
```

**使用场景**:
- 显示自选基金标签页
- 添加/移除自选时更新
- 导入/导出配置时包含

---

### 3. groups

**类型**: `Array<Object>`
**默认值**: `[]`
**说明**: 存储用户创建的基金分组信息
**云端同步**: 是

**数据结构**:
```javascript
[
  {
    id: string,           // 分组唯一标识
    name: string,         // 分组名称
    codes: Array<string>  // 分组内的基金代码列表
  }
]
```

**使用场景**:
- 显示分组标签页
- 分组管理（添加、编辑、删除）
- 导入/导出配置时包含

---

### 4. collapsedCodes

**类型**: `Array<string>`
**默认值**: `[]`
**说明**: 存储用户收起的基金代码列表（用于折叠基金详情）
**云端同步**: 是

**数据结构**:
```javascript
[
  "000001",  // 收起的基金代码
  "110022",
  // ...
]
```

**使用场景**:
- 记录用户折叠的基金卡片
- 页面刷新后保持折叠状态

---

### 5. collapsedTrends

**类型**: `Array<string>`
**默认值**: `[]`
**说明**: 存储用户收起的业绩走势图表的基金代码列表
**云端同步**: 是

**数据结构**:
```javascript
[
  "000001",  // 收起走势图的基金代码
  "110022",
  // ...
]
```

**使用场景**:
- 记录用户折叠的业绩走势图表
- 页面刷新后保持折叠状态

---

### 6. viewMode

**类型**: `string`
**默认值**: `'card'`
**可选值**: `'card'` | `'list'`
**说明**: 存储用户选择的视图模式
**云端同步**: 否（仅通过 customSettings 同步）

**数据结构**:
```javascript
'card'  // 卡片视图
'list'  // 列表视图
```

**使用场景**:
- 切换卡片/列表视图
- 页面刷新后保持视图模式

---

### 7. refreshMs

**类型**: `number` (字符串存储)
**默认值**: `30000` (30秒)
**最小值**: `5000` (5秒)
**说明**: 存储数据刷新间隔时间（毫秒）
**云端同步**: 是

**数据结构**:
```javascript
'30000'  // 30秒刷新一次
'60000'  // 60秒刷新一次
```

**使用场景**:
- 控制基金数据自动刷新频率
- 用户设置刷新间隔时更新

---

### 8. holdings

**类型**: `Object`
**默认值**: `{}`
**说明**: 存储用户的持仓信息
**云端同步**: 是

**数据结构**:
```javascript
{
  "000001": {
    share: number,  // 持有份额
    cost: number    // 持仓成本价
  },
  "110022": {
    share: number,
    cost: number
  }
}
```

**使用场景**:
- 计算持仓收益
- 买入/卖出操作时更新
- 导入/导出配置时包含

---

### 9. pendingTrades

**类型**: `Array<Object>`
**默认值**: `[]`
**说明**: 存储待处理的交易记录（当净值未更新时）
**云端同步**: 是

**数据结构**:
```javascript
[
  {
    id: string,          // 交易唯一标识
    fundCode: string,    // 基金代码
    fundName: string,    // 基金名称
    type: string,        // 交易类型 'buy' | 'sell'
    share: number,       // 交易份额
    amount: number,      // 交易金额
    feeRate: number,     // 手续费率
    feeMode: string,     // 手续费模式
    feeValue: number,    // 手续费金额
    date: string,        // 交易日期
    isAfter3pm: boolean, // 是否下午3点后
    timestamp: number    // 时间戳
  }
]
```

**使用场景**:
- 净值未更新时暂存交易
- 净值更新后自动处理待处理交易
- 导入/导出配置时包含

---

### 10. localUpdatedAt

**类型**: `string` (ISO 8601 格式)
**默认值**: `null`
**说明**: 存储本地数据最后更新时间戳，用于云端同步冲突检测
**云端同步**: 否（本地专用）

**数据结构**:
```javascript
'2024-01-15T10:30:00.000Z'
```

**使用场景**:
- 云端同步时比较数据版本
- 检测本地和云端数据冲突

---

### 11. hasClosedAnnouncement_v19

**类型**: `string`
**默认值**: `null`
**可选值**: `'true'`
**说明**: 标记用户是否已关闭公告弹窗（版本号后缀用于控制不同版本的公告）
**云端同步**: 否

**数据结构**:
```javascript
'true'  // 用户已关闭公告
```

**使用场景**:
- 控制公告弹窗显示
- 版本号后缀（v19）用于控制公告版本

---

### 12. customSettings

**类型**: `Object`
**默认值**: `{}`
**说明**: 存储用户的高级设置和偏好
**云端同步**: 是

**数据结构**:
```javascript
{
  localSortRules: [  // 排序规则配置
    {
      id: string,        // 规则唯一标识
      field: string,      // 排序字段
      label: string,      // 显示标签
      direction: 'asc' | 'desc',  // 排序方向
      enabled: boolean   // 是否启用
    }
  ],
  pcContainerWidth: number,  // PC端容器宽度（桌面版）
  marketIndexSelected: Array<string>,  // 选中的市场指数代码
  // ... 其他自定义设置
}
```

**使用场景**:
- 排序规则持久化
- PC端布局宽度设置
- 市场指数选择
- 云端同步所有自定义设置

---

### 13. localSortBy / localSortOrder

**类型**: `string`
**默认值**: `'default'` / `'asc'`
**说明**: 存储当前排序字段和排序方向
**云端同步**: 否（通过 customSettings 同步）

**数据结构**:
```javascript
// localSortBy
'gszzl'  // 按估算涨跌幅排序
'default'  // 默认排序

// localSortOrder
'asc'   // 升序
'desc'  // 降序
```

**使用场景**:
- 快速访问当前排序状态
- 与 customSettings.localSortRules 保持同步

---

### 14. localSortRules (旧版)

**类型**: `Array<Object>`
**默认值**: `[]`
**说明**: 旧版排序规则存储，已迁移到 customSettings.localSortRules
**云端同步**: 否

**注意**: 该键已弃用，数据已迁移到 customSettings.localSortRules。代码中仍保留兼容性处理。

---

### 15. currentTab

**类型**: `string`
**默认值**: `'all'`
**说明**: 存储用户当前选中的标签页
**云端同步**: 否

**数据结构**:
```javascript
'all'     // 全部资产
'fav'     // 自选
groupId   // 分组ID，如 'group_xxx'
```

**使用场景**:
- 恢复用户上次查看的标签页
- 页面刷新后保持标签页状态

---

### 16. theme

**类型**: `string`
**默认值**: `'dark'`
**可选值**: `'light'` | `'dark'`
**说明**: 存储用户选择的主题模式
**云端同步**: 否

**数据结构**:
```javascript
'dark'  // 暗色主题
'light'  // 亮色主题
```

**使用场景**:
- 控制应用整体配色
- 页面加载时立即应用（通过 layout.jsx 内联脚本）

---

### 17. fundValuationTimeseries

**类型**: `Object`
**默认值**: `{}`
**说明**: 存储基金估值分时数据，用于走势图展示
**云端同步**: 否（测试中功能，暂不同步）

**数据结构**:
```javascript
{
  "000001": [  // 按基金代码索引
    {
      time: string,   // 时间点 "HH:mm"
      value: number,  // 估算净值
      date: string    // 日期 "YYYY-MM-DD"
    }
  ],
  "110022": [
    // ...
  ]
}
```

**数据清理规则**:
- 当新数据日期大于已存储的最大日期时，清空该基金所有旧日期数据，只保留当日分时
- 同一日期内按时间顺序追加数据

**使用场景**:
- 基金详情页分时图展示
- 实时估值数据记录

---

### 18. transactions

**类型**: `Object`
**默认值**: `{}`
**说明**: 存储用户的交易历史记录
**云端同步**: 是

**数据结构**:
```javascript
{
  "000001": [  // 按基金代码索引的交易列表
    {
      id: string,        // 交易唯一标识
      type: 'buy' | 'sell',  // 交易类型
      amount: number,    // 交易金额
      share: number,     // 交易份额
      price: number,    // 成交价格
      date: string,      // 交易日期
      timestamp: number  // 时间戳
    }
  ],
  "110022": [
    // ...
  ]
}
```

**使用场景**:
- 交易历史查询
- 收益计算
- 买入/卖出操作记录

---

### 19. dcaPlans (定投计划)

**类型**: `Object`
**默认值**: `{}`
**说明**: 存储用户的定投计划配置
**云端同步**: 是

**数据结构**:
```javascript
{
  "000001": {    // 按基金代码索引
    amount: number,    // 每次定投金额
    feeRate: number,   // 手续费率
    cycle: string,     // 定投周期
    firstDate: string, // 首次定投日期
    enabled: boolean   // 是否启用
  },
  "110022": {
    // ...
  }
}
```

**使用场景**:
- 自动定投执行
- 定投计划管理
- 买入操作时设置

---

### 20. marketIndexSelected

**类型**: `Array<string>`
**默认值**: `[]`
**说明**: 存储用户选中的市场指数代码
**云端同步**: 否（通过 customSettings 同步）

**数据结构**:
```javascript
[
  "sh000001",  // 上证指数
  "sz399001",  // 深证成指
  // ...
]
```

**使用场景**:
- 市场指数面板显示
- 指数选择管理

---

## 数据同步机制

### 云端同步

项目支持通过 Supabase 进行云端数据同步。以下键参与云端同步：

**参与云端同步的键**:
- funds
- favorites
- groups
- collapsedCodes
- collapsedTrends
- refreshMs
- holdings
- pendingTrades
- transactions
- dcaPlans
- customSettings

**不参与云端同步的键**:
- localUpdatedAt（本地专用）
- hasClosedAnnouncement_v19（本地专用）
- localSortBy / localSortOrder（通过 customSettings 同步）
- localSortRules（旧版兼容，通过 customSettings 同步）
- currentTab（本地会话状态）
- theme（本地主题偏好）
- fundValuationTimeseries（测试中功能）
- marketIndexSelected（通过 customSettings 同步）
- viewMode（通过 customSettings 同步）

**同步流程**:
1. 用户登录后，本地数据会自动上传到云端
2. 用户在其他设备登录时，会从云端下载数据
3. 当本地和云端数据不一致时，会提示用户选择使用哪份数据

### 导入/导出

用户可以导出配置到 JSON 文件，或从 JSON 文件导入配置：

**导出格式**:
```javascript
{
  funds: [],
  favorites: [],
  groups: [],
  collapsedCodes: [],
  refreshMs: 30000,
  holdings: {},
  pendingTrades: [],
  transactions: {},
  dcaPlans: {},
  customSettings: {},
  exportedAt: '2024-01-15T10:30:00.000Z'
}
```

**导入逻辑**:
- 合并基金列表（去重）
- 合并自选、分组等配置
- 保留现有数据，避免覆盖

---

## 数据验证和清理

### 数据去重

基金列表使用 `dedupeByCode` 函数进行去重，确保每个基金代码只出现一次。

```javascript
const dedupeByCode = (list) => {
  const seen = new Set();
  return list.filter(f => {
    if (!f?.code) return false;
    if (seen.has(f.code)) return false;
    seen.add(f.code);
    return true;
  });
};
```

### 数据清理

在收集数据上传云端时，会进行数据验证和清理：

1. 清理无效的持仓数据（基金不存在的持仓）
2. 清理无效的自选、分组、收起状态
3. 清理无效的交易记录和定投计划
4. 确保数据类型正确

---

## 存储辅助工具

项目使用 `storageHelper` 对象来封装 localStorage 操作，提供统一的错误处理和云端同步触发。

```javascript
const storageHelper = {
  setItem: (key, value) => {
    // 1. 写入 localStorage
    // 2. 触发云端同步（如果是同步键）
    // 3. 更新 localUpdatedAt 时间戳
  },
  getItem: (key) => {
    // 从 localStorage 读取
  },
  removeItem: (key) => {
    // 从 localStorage 删除
    // 触发云端同步
  },
  clear: () => {
    // 清空所有 localStorage
  }
};
```

**特性**:
- 自动触发云端同步（对于参与同步的键）
- 自动更新 localUpdatedAt 时间戳
- funds 变更时比较签名，避免无意义同步

---

## 注意事项

1. **数据大小限制**: localStorage 有约 5-10MB 的存储限制，大量基金数据可能超出限制
2. **数据同步**: 修改数据后需要同时更新 localStorage 和 React state
3. **错误处理**: 所有 localStorage 操作都应包含 try-catch 错误处理
4. **数据格式**: 复杂数据必须使用 JSON.stringify/JSON.parse 进行序列化/反序列化
5. **版本控制**: 公告等配置使用版本号后缀，便于控制不同版本的显示
6. **fundValuationTimeseries**: 该数据不同步到云端，因为数据量较大且属于临时性数据

---

## 相关文件

- `app/page.jsx` - 主要页面组件，包含所有 localStorage 操作
- `app/components/Announcement.jsx` - 公告组件
- `app/components/PcFundTable.jsx` - PC端基金表格组件
- `app/components/MobileFundTable.jsx` - 移动端基金表格组件
- `app/components/MarketIndexAccordion.jsx` - 市场指数组件
- `app/lib/supabase.js` - Supabase 客户端配置
- `app/lib/valuationTimeseries.js` - 估值分时数据管理

---

## 更新日志

- **2026-03-18**: 全面更新文档，补充 transactions、dcaPlans、fundValuationTimeseries、customSettings 等键的详细说明，修正云端同步键列表
- **2026-02-19**: 初始文档创建
