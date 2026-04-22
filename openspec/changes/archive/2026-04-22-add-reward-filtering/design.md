## Context

当前奖励页面通过 `RewardService` 拉取奖励数据，并在 `RewardPage.vue` 中直接渲染完整列表。奖励是否可领取、是否已领取、是否已过期等状态语义已经封装在 `Reward` 实体中，因此这次变更应复用现有实体方法，而不是在 UI 层再次写一套筛选判断。

这次改动会同时涉及 UI、application 和测试层，但不需要改动接口协议或存储结构。核心约束是保持当前 clean architecture 的依赖方向不变：页面层只管理用户交互状态，奖励筛选规则继续由 application 层根据领域行为统一决定。

## Goals / Non-Goals

**Goals:**
- 让用户可以在奖励页面切换查看全部、可领取、已领取、已过期四种奖励视图。
- 将筛选规则集中在 application 层，并与现有 `Reward` 实体方法保持一致。
- 确保数量统计、空状态和领取操作在筛选开启后仍然表现一致。
- 增加同时覆盖筛选逻辑和页面筛选体验的测试。

**Non-Goals:**
- 不修改奖励接口返回结构，也不新增服务端筛选能力。
- 不调整奖励领取资格规则或奖励状态流转逻辑。
- 不做筛选条件的跨会话或跨平台持久化。
- 不对奖励页面进行超出筛选控件范围的大幅改版。

## Decisions

### Keep filter evaluation in `RewardService`
`RewardService` 提供一个按状态筛选奖励的方法，基于当前内存中的奖励列表返回匹配结果。这样可以保证奖励状态解释只有一个来源，并让 `RewardPage.vue` 继续专注于展示和交互。

备选方案：直接在 Vue 的 computed 中写内联筛选逻辑。这样接线更快，但会复制 `Reward` 中已有的业务规则，也不利于后续复用。

### Model filter state as a typed UI selection
UI 层用 `src/types/index.ts` 中定义的联合类型表示当前筛选值，再根据 service 输出计算可见列表和筛选后的统计信息。这样页面状态更明确，测试也更容易写。

备选方案：仅在组件内部使用裸字符串。这样可以少写一点类型，但会削弱 UI 与 application 层之间的约束关系。

### Keep claim interactions operating on the filtered list without special handling
领取操作仍然以奖励 ID 为目标，领取完成后页面基于当前筛选条件重新计算可见列表。这样不需要在 UI 中维护第二份列表状态，也避免手工移动或删除列表项的额外逻辑。

备选方案：在组件中手工删除或移动已领取奖励。这样会增加更多只属于页面层的分支处理，也容易和 service 持有的奖励状态产生偏差。

## Risks / Trade-offs

- [筛选语义与奖励状态方法出现偏差] -> 在 service 中通过 `Reward` 的 `isClaimable`、`isClaimed`、`isExpired` 等方法实现筛选，避免重复判断。
- [筛选后的空状态语义不清晰] -> 让空状态文案跟随当前筛选条件变化，而不是统一显示“暂无奖励”。
- [测试过度依赖页面样式细节] -> 测试重点放在筛选选项、可见奖励集合和筛选状态下的领取行为，而不是样式结构。
- [service 筛选依赖已加载的奖励数据] -> 在设计和测试中明确说明筛选基于 `getRewardList` 后当前持有的奖励列表进行。
