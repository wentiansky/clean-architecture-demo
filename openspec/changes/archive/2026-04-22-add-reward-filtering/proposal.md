## Why

当前的福利中心将所有奖励混合展示在一个列表中。随着已领取和已过期奖励逐渐增多，用户会更难快速找到仍可领取的奖励，因此需要补充按状态筛选的能力来提升查找效率，同时不改变现有领取流程和多端适配方式。

## What Changes

- 在福利中心增加奖励状态筛选，允许用户在全部、可领取、已领取、已过期之间切换。
- 将筛选规则保留在 application 层，避免页面组件重复实现奖励状态判断逻辑。
- 更新奖励列表展示逻辑，使数量统计和空状态能够随当前筛选条件变化。
- 补充针对奖励筛选行为和筛选后列表渲染的测试。

## Capabilities

### New Capabilities
- `reward-list-filtering`: 允许用户按奖励状态筛选列表，同时保持奖励状态展示和领取交互的正确性。

### Modified Capabilities

## Impact

- 受影响代码包括：`src/ui/views/RewardPage.vue`、`src/application/services/RewardService.ts`、`src/types/index.ts` 以及相关测试文件。
- 不涉及 API 协议变更，现有奖励列表与奖励领取接口保持不变。
- 不需要新增运行时依赖。
