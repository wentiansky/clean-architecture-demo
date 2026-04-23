# 奖励排序实现计划

> **给代理执行者：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务逐步实现本计划。步骤使用复选框（`- [ ]`）语法进行跟踪。

**目标：** 为奖励列表添加排序能力，使没有过期时间的奖励排在最前面，其余奖励在各个筛选视图中按“越快过期越靠前”排序。

**架构：** 将排序逻辑放在应用服务层，确保规则可复用且可测试。Vue 页面仅负责组合展示逻辑，通过先调用服务层筛选、再调用服务层排序来生成最终列表。测试同时覆盖服务层规则和页面渲染顺序。

**技术栈：** Vue 3、TypeScript、Vitest、Vue Test Utils

---

### 任务 1：定义服务层排序行为

**文件：**
- 修改：`tests/reward-service.spec.ts`
- 修改：`src/application/services/RewardService.ts`
- 测试：`tests/reward-service.spec.ts`

- [ ] **步骤 1：先写失败测试**

```ts
it('sorts rewards with no expiry first, then by nearest expiry, while keeping stable order', () => {
  const service = new RewardService();
  const rewards = [
    new Reward({
      id: 'same_time_a',
      name: '同时间A',
      type: 'coupon',
      value: 5,
      description: '',
      icon: '',
      status: 'available',
      expireTime: '2099-06-01T00:00:00Z',
      rules: {}
    }),
    new Reward({
      id: 'no_expire',
      name: '永久奖励',
      type: 'coupon',
      value: 50,
      description: '',
      icon: '',
      status: 'available',
      expireTime: null,
      rules: {}
    }),
    new Reward({
      id: 'same_time_b',
      name: '同时间B',
      type: 'coupon',
      value: 6,
      description: '',
      icon: '',
      status: 'available',
      expireTime: '2099-06-01T00:00:00Z',
      rules: {}
    }),
    new Reward({
      id: 'sooner',
      name: '更快过期',
      type: 'coupon',
      value: 10,
      description: '',
      icon: '',
      status: 'available',
      expireTime: '2099-01-01T00:00:00Z',
      rules: {}
    })
  ];

  expect(service.getSortedRewards(rewards).map((reward) => reward.id)).toEqual([
    'no_expire',
    'sooner',
    'same_time_a',
    'same_time_b'
  ]);
});
```

- [ ] **步骤 2：运行测试并确认它先失败**

运行：`npm test -- tests/reward-service.spec.ts`
预期：FAIL，并出现 `service.getSortedRewards is not a function`

- [ ] **步骤 3：编写最小实现**

```ts
getSortedRewards(rewards: Reward[] = this.rewardList): Reward[] {
  return rewards
    .map((reward, index) => ({
      reward,
      index
    }))
    .sort((left, right) => {
      const leftExpireTime = this.getRewardSortTime(left.reward);
      const rightExpireTime = this.getRewardSortTime(right.reward);

      if (leftExpireTime === rightExpireTime) {
        return left.index - right.index;
      }

      return leftExpireTime - rightExpireTime;
    })
    .map(({ reward }) => reward);
}

private getRewardSortTime(reward: Reward): number {
  if (!reward.expireTime) {
    return Number.NEGATIVE_INFINITY;
  }

  return new Date(reward.expireTime).getTime();
}
```

- [ ] **步骤 4：运行测试并确认通过**

运行：`npm test -- tests/reward-service.spec.ts`
预期：PASS，新加的排序测试和原有服务层测试都通过

- [ ] **步骤 5：提交**

```bash
git add tests/reward-service.spec.ts src/application/services/RewardService.ts
git commit -m "feat: add reward sorting service"
```

### 任务 2：在奖励页面应用排序结果

**文件：**
- 修改：`tests/reward-page.spec.ts`
- 修改：`src/ui/views/RewardPage.vue`
- 测试：`tests/reward-page.spec.ts`

- [ ] **步骤 1：先写失败测试**

```ts
it('renders all rewards by default and switches filters', async () => {
  const wrapper = mount(RewardPage);
  await flushPromises();

  expect(wrapper.findAll('.reward-name').map((node) => node.text())).toEqual([
    '永久奖励',
    '已过期奖励',
    '先过期奖励',
    '已领取但快过期',
    '已领取但晚过期',
    '后过期奖励'
  ]);

  await wrapper.get('button.filter-chip:nth-child(3)').trigger('click');

  expect(wrapper.findAll('.reward-name').map((node) => node.text())).toEqual([
    '已领取但快过期',
    '已领取但晚过期'
  ]);
});
```

- [ ] **步骤 2：运行测试并确认它先失败**

运行：`npm test -- tests/reward-page.spec.ts`
预期：FAIL，因为页面此时仍然渲染未排序的筛选结果

- [ ] **步骤 3：编写最小实现**

```ts
const visibleRewards = computed(() => {
  const filteredRewards = rewardService.getFilteredRewards(activeFilter.value, rewardList.value);
  return rewardService.getSortedRewards(filteredRewards);
});
```

- [ ] **步骤 4：运行测试并确认通过**

运行：`npm test -- tests/reward-page.spec.ts`
预期：PASS，默认列表和筛选后的渲染顺序都符合排序规则

- [ ] **步骤 5：提交**

```bash
git add tests/reward-page.spec.ts src/ui/views/RewardPage.vue
git commit -m "feat: sort rewards in filtered views"
```

### 任务 3：验证端到端交付产物

**文件：**
- 创建：`docs/superpowers/specs/2026-04-23-reward-sorting-design.md`
- 创建：`docs/superpowers/plans/2026-04-23-reward-sorting.md`
- 测试：`tests/reward-service.spec.ts`
- 测试：`tests/reward-page.spec.ts`

- [ ] **步骤 1：编写文档文件**

```md
# 奖励排序设计

## 背景

奖励页当前支持按状态筛选，但列表顺序保持接口原始顺序，用户难以快速看到即将过期的奖励。
```

- [ ] **步骤 2：运行定向验证**

运行：`npm test -- tests/reward-service.spec.ts tests/reward-page.spec.ts`
预期：PASS，服务层排序测试和页面渲染测试都通过

- [ ] **步骤 3：运行全量验证**

运行：`npm test`
预期：PASS，全部测试文件通过

- [ ] **步骤 4：运行类型检查**

运行：`npm run typecheck`
预期：PASS，没有 TypeScript 错误

- [ ] **步骤 5：提交**

```bash
git add docs/superpowers/specs/2026-04-23-reward-sorting-design.md \
        docs/superpowers/plans/2026-04-23-reward-sorting.md \
        tests/reward-service.spec.ts \
        tests/reward-page.spec.ts \
        src/application/services/RewardService.ts \
        src/ui/views/RewardPage.vue
git commit -m "docs: add reward sorting workflow artifacts"
```

## 自检

- 规格覆盖：本计划覆盖了服务层排序规则、页面集成、文档补充和验证步骤。
- 占位符检查：没有遗留 `TODO`、`TBD` 或含糊的测试步骤描述。
- 类型一致性：`getSortedRewards`、`Reward.expireTime` 和 `visibleRewards` 等名称与实现代码保持一致。

## 说明

这份计划是在功能实现之后补写的，用于补齐仓库流程。该功能对应的代码和测试已经完成并通过验证。
