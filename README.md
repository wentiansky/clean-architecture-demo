# Clean Architecture Demo - 会员福利中心

基于 Clean Architecture 分层架构的 Vue2 项目示例，展示如何在多端（H5/Android/iOS）场景下实现业务逻辑的复用和解耦。

## 项目架构

```
src/
├── adapter/              # 适配器层 - 与外部环境交互
│   ├── api/              # 网络请求封装
│   │   ├── request.js    # 基础请求封装
│   │   └── reward.js     # 奖励相关 API
│   ├── bridge/           # 端能力桥接
│   │   └── index.js      # H5/Android/iOS 统一桥接
│   ├── platform/         # 平台检测
│   │   └── index.js      # 平台判断工具
│   ├── router/           # 路由适配
│   │   └── index.js      # 统一路由封装
│   ├── storage/          # 存储适配
│   │   └── index.js      # 本地存储封装
│   └── index.js          # 统一导出
│
├── application/          # 应用层 - 核心业务逻辑
│   ├── entities/         # 领域实体
│   │   ├── Reward.js     # 奖励实体
│   │   └── User.js       # 用户实体
│   ├── services/         # 业务服务
│   │   └── RewardService.js  # 奖励服务（核心业务逻辑）
│   └── index.js          # 统一导出
│
├── ui/                   # UI 层 - 页面渲染
│   ├── components/       # 组件
│   │   └── RewardCard.vue    # 奖励卡片组件
│   ├── views/            # 页面
│   │   └── RewardPage.vue    # 奖励列表页
│   ├── App.vue           # 根组件
│   └── index.js          # 统一导出
│
└── main.js               # 入口文件
```

## 分层职责

### 1. Adapter 层（适配器层）

**职责**：负责与外部环境交互，封装平台差异和基础设施能力。

**包含内容**：
- `api/`：网络请求封装，统一处理请求/响应拦截、错误处理
- `bridge/`：JSBridge 封装，提供统一的 H5/Android/iOS 调用接口
- `platform/`：平台检测，识别当前运行环境
- `router/`：路由适配，统一处理页面跳转（H5 用 location，App 用原生）
- `storage/`：存储适配，统一封装 localStorage/NativeStorage

**设计原则**：
- 上层（application/ui）不直接调用原生能力，必须通过 adapter
- 新增平台只需在 adapter 层扩展，不影响业务逻辑

### 2. Application 层（应用层）

**职责**：承载核心业务逻辑，与平台、UI 解耦。

**包含内容**：
- `entities/`：领域实体，封装业务规则和数据结构
  - `Reward`：奖励实体，包含领取状态判断、显示值计算等方法
  - `User`：用户实体，包含会员状态判断等方法
- `services/`：业务服务，编排业务逻辑
  - `RewardService`：奖励服务，处理领取流程、资格校验、缓存管理等

**设计原则**：
- 只依赖 adapter 层，不依赖 ui 层
- 通过领域实体封装业务规则（如：如何判断奖励可领取）
- 核心业务逻辑（领取流程）在此层实现，与 UI 无关

### 3. UI 层（界面层）

**职责**：只负责页面渲染和交互，将 application 层给出的状态映射成视图。

**包含内容**：
- `components/`：可复用组件
- `views/`：页面组件

**设计原则**：
- 不直接调用 API 或原生能力
- 不处理核心业务逻辑（如资格校验、状态流转）
- 只负责：展示数据、转发用户事件、反馈操作结果

## 核心流程示例：领取奖励

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   UI Layer  │────▶│ Application │────▶│   Adapter Layer  │
│             │     │    Layer    │     │                 │
└─────────────┘     └─────────────┘     └─────────────────┘
       │                   │                       │
       │                   │                       │
       ▼                   ▼                       ▼
  1. 用户点击         2. 业务校验              3. 调用 API
     领取按钮           - 检查是否已领取         - HTTP 请求
       │               - 检查是否过期          - 埋点上报
       │               - 检查会员资格          - 原生 Toast
       │                   │                       │
       │                   ▼                       │
       │              4. 更新状态                  │
       │                 - 标记已领取              │
       │                 - 更新缓存                │
       │                   │                       │
       ▼                   ▼                       │
  5. 展示结果         6. 返回结果                 │
     - 成功提示           - success/fail           │
     - 刷新视图           - 错误信息               │
```

## 多平台适配示例

### Toast 提示
```javascript
// adapter/bridge/index.js

// H5 实现
const h5Bridge = {
  showToast(message) {
    alert(message); // 或使用 UI 组件
    return Promise.resolve({ success: true });
  }
};

// Android 实现
const androidBridge = {
  showToast(message) {
    return new Promise((resolve) => {
      try {
        window.AndroidBridge.showToast(message);
        resolve({ success: true });
      } catch (e) {
        resolve({ success: false, error: e.message });
      }
    });
  }
};

// iOS 实现
const iosBridge = {
  showToast(message) {
    return this.callHandler('showToast', { message });
  }
};
```

### 路由跳转
```javascript
// adapter/router/index.js
const router = {
  push(url, options = {}) {
    if (options.native && platform.isApp()) {
      // App 内打开原生页面
      return bridge.openPage(url);
    }
    // H5 正常跳转
    window.location.href = url;
  }
};
```

## 防耦合机制

### 1. 目录边界
```javascript
// application 层不允许导入 ui 层的任何模块
// ✅ 正确
import { rewardApi } from '@/adapter/api/reward';

// ❌ 错误 - 会导致循环依赖
import SomeComponent from '@/ui/components/SomeComponent';
```

### 2. 依赖方向
```
UI Layer ───────▶ Application Layer ───────▶ Adapter Layer
   │                                            │
   └────────────── 只允许单向依赖 ──────────────┘
```

### 3. Code Review 检查清单
- [ ] application 层是否包含 UI 相关代码？
- [ ] ui 层是否直接调用了原生能力？
- [ ] 新增的平台差异是否在 adapter 层处理？
- [ ] 业务规则是否封装在实体或服务中？

## 运行项目

```bash
# 安装依赖
npm install

# 开发模式运行
npm run serve

# 构建
npm run build
```

## 适用场景

### 推荐使用
- 中大型业务项目
- 多端复用诉求（H5/App/小程序）
- 业务逻辑复杂，需要长期迭代

### 不推荐
- 短期活动页
- 生命周期很短的项目
- 纯展示型页面，几乎没有业务逻辑

## 核心收益

1. **业务与 UI 解耦**：修改业务逻辑不影响 UI，UI 改版不改动业务逻辑
2. **多端复用**：application 层可在 H5/Android/iOS 间复用
3. **可测试性**：业务逻辑可脱离 UI 单独测试
4. **维护成本**：修改范围明确，需求迭代和测试回归更可控
