# Reward Sorting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reward list sorting so rewards without an expiry appear first and all other rewards are ordered by nearest expiry within every filtered view.

**Architecture:** Keep sorting in the application service so the rule is shared and testable. The Vue page keeps responsibility for view composition only by asking the service to filter first and then sort. Tests cover both the service rule and rendered order in the page.

**Tech Stack:** Vue 3, TypeScript, Vitest, Vue Test Utils

---

### Task 1: Define Service-Level Sorting Behavior

**Files:**
- Modify: `tests/reward-service.spec.ts`
- Modify: `src/application/services/RewardService.ts`
- Test: `tests/reward-service.spec.ts`

- [ ] **Step 1: Write the failing test**

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

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/reward-service.spec.ts`
Expected: FAIL with `service.getSortedRewards is not a function`

- [ ] **Step 3: Write minimal implementation**

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

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/reward-service.spec.ts`
Expected: PASS for the new sorting test and existing service tests

- [ ] **Step 5: Commit**

```bash
git add tests/reward-service.spec.ts src/application/services/RewardService.ts
git commit -m "feat: add reward sorting service"
```

### Task 2: Apply Sorted Results In The Reward Page

**Files:**
- Modify: `tests/reward-page.spec.ts`
- Modify: `src/ui/views/RewardPage.vue`
- Test: `tests/reward-page.spec.ts`

- [ ] **Step 1: Write the failing test**

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

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/reward-page.spec.ts`
Expected: FAIL because the page still renders unsorted filtered results

- [ ] **Step 3: Write minimal implementation**

```ts
const visibleRewards = computed(() => {
  const filteredRewards = rewardService.getFilteredRewards(activeFilter.value, rewardList.value);
  return rewardService.getSortedRewards(filteredRewards);
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/reward-page.spec.ts`
Expected: PASS with sorted default and filtered rendering order

- [ ] **Step 5: Commit**

```bash
git add tests/reward-page.spec.ts src/ui/views/RewardPage.vue
git commit -m "feat: sort rewards in filtered views"
```

### Task 3: Verify End-To-End Delivery Artifacts

**Files:**
- Create: `docs/superpowers/specs/2026-04-23-reward-sorting-design.md`
- Create: `docs/superpowers/plans/2026-04-23-reward-sorting.md`
- Test: `tests/reward-service.spec.ts`
- Test: `tests/reward-page.spec.ts`

- [ ] **Step 1: Write the documentation files**

```md
# 奖励排序设计

## 背景

奖励页当前支持按状态筛选，但列表顺序保持接口原始顺序，用户难以快速看到即将过期的奖励。
```

- [ ] **Step 2: Run focused verification**

Run: `npm test -- tests/reward-service.spec.ts tests/reward-page.spec.ts`
Expected: PASS with service sorting and page rendering tests both green

- [ ] **Step 3: Run full verification**

Run: `npm test`
Expected: PASS with all test files green

- [ ] **Step 4: Run type checking**

Run: `npm run typecheck`
Expected: PASS with no TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-04-23-reward-sorting-design.md \
        docs/superpowers/plans/2026-04-23-reward-sorting.md \
        tests/reward-service.spec.ts \
        tests/reward-page.spec.ts \
        src/application/services/RewardService.ts \
        src/ui/views/RewardPage.vue
git commit -m "docs: add reward sorting workflow artifacts"
```

## Self-Review

- Spec coverage: plan covers service sorting rule, page integration, documentation, and verification.
- Placeholder scan: no `TODO`, `TBD`, or implicit test steps remain.
- Type consistency: `getSortedRewards`, `Reward.expireTime`, and `visibleRewards` names match the implemented code.

## Note

This plan is being written after implementation to complete the repository workflow. The code and tests for the feature are already in place and verified.
