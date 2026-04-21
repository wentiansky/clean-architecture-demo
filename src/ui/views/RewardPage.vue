<template>
  <div class="reward-page">
    <header class="page-header">
      <h1>会员福利中心</h1>
      <p class="subtitle">{{ platformText }}端专享权益</p>
      <div v-if="claimableCount > 0" class="badge">
        {{ claimableCount }}个待领取
      </div>
    </header>

    <div v-if="userInfo" class="user-card">
      <img :src="userInfo.avatar || defaultAvatar" class="user-avatar" alt="avatar" />
      <div class="user-meta">
        <span class="user-name">{{ userInfo.name || '游客' }}</span>
        <span class="user-level">{{ levelName }}</span>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <p>加载中...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="retry-btn" @click="loadRewardList">重新加载</button>
    </div>

    <div v-else class="reward-list">
      <RewardCard
        v-for="reward in rewardList"
        :key="reward.id"
        :reward="reward"
        @claim="handleClaim"
      />

      <div v-if="rewardList.length === 0" class="empty-state">
        <p>暂无奖励</p>
      </div>
    </div>

    <div class="longtask-section">
      <h3>⏱️ 长任务监控测试</h3>

      <div class="task-buttons">
        <button class="task-btn danger" :disabled="isSimulating" @click="simulateLongTask">
          {{ isSimulating ? '执行中...' : '模拟长任务' }}
        </button>
        <button class="task-btn info" @click="simulateShortTasks">模拟短任务队列</button>
      </div>

      <div class="task-stats">
        <p>
          检测到 <strong>{{ longTasks.length }}</strong> 个长任务 (Long Task > 50ms)
        </p>
      </div>

      <div v-if="longTasks.length > 0" class="task-list">
        <div v-for="task in longTasks" :key="task.id" class="task-item">
          <span class="task-name">{{ task.name }}</span>
          <span class="task-duration" :class="{ high: task.duration > 100 }">
            {{ task.duration.toFixed(2) }}ms
          </span>
          <span class="task-time">@ {{ task.startTime.toFixed(0) }}ms</span>
        </div>
      </div>
    </div>

    <div class="action-bar">
      <button class="action-btn secondary" @click="goBack">返回</button>
      <button class="action-btn primary" @click="refresh">刷新列表</button>
    </div>

    <div v-if="toastMessage" class="toast" :class="toastType">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { Reward, rewardService } from '@/application';
import platform from '@/adapter/platform';
import router from '@/adapter/router';
import storage from '@/adapter/storage';
import type { LongTaskEntry, LongTaskItem, ToastType, UserInfo } from '@/types';
import RewardCard from '../components/RewardCard.vue';

interface ClaimPayload {
  rewardId: string;
  onStart?: () => void;
  onComplete?: () => void;
}

const loading = ref(false);
const error = ref<string | null>(null);
const toastMessage = ref('');
const toastType = ref<ToastType>('success');
const rewardList = ref<Reward[]>([]);
const userInfo = ref<UserInfo | null>(null);
const defaultAvatar = 'https://via.placeholder.com/40';
const longTasks = ref<LongTaskItem[]>([]);
const isSimulating = ref(false);
let longTaskObserver: PerformanceObserver | null = null;

const claimableCount = computed(() => rewardList.value.filter((reward) => reward.isClaimable()).length);

const platformText = computed(() => {
  const map: Record<string, string> = {
    h5: 'H5',
    android: 'Android',
    ios: 'iOS',
    wechat: '微信小程序'
  };

  return map[platform.type] ?? 'H5';
});

const levelName = computed(() => {
  const levels = ['普通用户', '铜牌会员', '银牌会员', '金牌会员', '钻石会员'];
  return levels[userInfo.value?.level ?? 0] ?? '普通用户';
});

const initPage = async () => {
  userInfo.value = storage.get<UserInfo>('user_info') ?? {
    id: 'guest',
    name: '测试用户',
    avatar: '',
    level: 1,
    points: 0,
    isMember: false,
    memberExpiry: null
  };

  await loadRewardList();
};

const loadRewardList = async () => {
  loading.value = true;
  error.value = null;

  try {
    rewardList.value = await rewardService.getRewardList();
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败';
  } finally {
    loading.value = false;
  }
};

const handleClaim = async ({ rewardId, onStart, onComplete }: ClaimPayload) => {
  onStart?.();

  try {
    const result = await rewardService.claimReward(rewardId);
    showToast(result.message, result.success ? 'success' : 'error');
  } finally {
    onComplete?.();
  }
};

const refresh = async () => {
  await loadRewardList();
  showToast('已刷新', 'success');
};

const goBack = () => {
  router.back();
};

const showToast = (message: string, type: ToastType = 'success') => {
  toastMessage.value = message;
  toastType.value = type;
  window.setTimeout(() => {
    toastMessage.value = '';
  }, 3000);
};

const logLongTask = (entry: LongTaskEntry) => {
  console.group(
    `🐌 长任务 #${longTasks.value.length} - ${entry.duration.toFixed(2)}ms @ ${entry.startTime.toFixed(0)}ms`
  );

  console.log('%c基本信息:', 'color: #667eea; font-weight: bold');
  console.table({
    名称: entry.name,
    持续时间: `${entry.duration.toFixed(2)}ms`,
    开始时间: `${entry.startTime.toFixed(2)}ms`,
    结束时间: `${(entry.startTime + entry.duration).toFixed(2)}ms`,
    类型: entry.entryType,
    归因数量: entry.attribution?.length ?? 0
  });

  console.log('%c完整 entry 对象:', 'color: #48dbfb; font-weight: bold');
  console.log('entry.toJSON():', entry.toJSON());
  console.log('entry 实例:', entry);

  if (entry.attribution && entry.attribution.length > 0) {
    console.log('%c归因详情 (attribution) - 揭示长任务来源:', 'color: #ff6b6b; font-weight: bold');
    entry.attribution.forEach((attr, idx) => {
      console.group(`归因 #${idx + 1}`);
      console.log('容器类型:', attr.containerType);
      console.log('容器名称:', attr.containerName);
      console.log('容器Src:', attr.containerSrc);
      console.log('容器ID:', attr.containerId);
      console.log('脚本URL:', attr.scriptUrl || '内联脚本/当前页面');
      console.log('行号:', attr.lineNumber);
      console.log('列号:', attr.columnNumber);
      console.log('函数名:', attr.functionName || '匿名函数');
      console.log('执行上下文:', attr.executionContext);
      console.log('类型:', attr.type);
      console.groupEnd();
    });
  } else {
    console.log('%c无归因信息 - 可能是浏览器内部操作或无法追踪的脚本', 'color: #feca57; font-weight: bold');
  }

  console.log('%c任务来源推测:', 'color: #1dd1a1; font-weight: bold');
  if (entry.startTime < 500) {
    console.log('📌 可能是: 浏览器初始化 / Vue 框架启动 / 脚本加载解析');
  } else if (entry.startTime < 1500) {
    console.log('📌 可能是: 组件挂载 / 数据初始化 / 首次渲染');
  } else if (entry.startTime < 3000) {
    console.log('📌 可能是: 异步数据获取 / API响应处理 / 列表渲染');
  } else {
    console.log('📌 可能是: 用户交互响应 / 点击事件处理');
  }

  console.groupEnd();
};

const initPerformanceObserver = () => {
  if (!('PerformanceObserver' in window)) {
    console.warn('当前浏览器不支持 PerformanceObserver');
    return;
  }

  try {
    longTaskObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((performanceEntry) => {
        const entry = performanceEntry as LongTaskEntry;
        const taskInfo: LongTaskItem = {
          name: entry.name,
          duration: entry.duration,
          startTime: entry.startTime,
          entryType: entry.entryType,
          id: Date.now() + Math.random()
        };

        longTasks.value.unshift(taskInfo);
        if (longTasks.value.length > 10) {
          longTasks.value.pop();
        }

        logLongTask(entry);
      });
    });

    longTaskObserver.observe({ entryTypes: ['longtask'] });
    console.log('✅ PerformanceObserver 长任务监控已启动');
    console.log('%c提示: 刷新页面查看加载时的长任务详情', 'color: #1dd1a1');
  } catch (err) {
    console.error('PerformanceObserver 初始化失败:', err);
  }
};

const simulateLongTask = () => {
  isSimulating.value = true;
  console.log('🚀 开始模拟长任务...');

  window.setTimeout(() => {
    const startTime = performance.now();
    let result = 0;

    for (let index = 0; index < 100000000; index += 1) {
      result += Math.sqrt(index) * Math.sin(index);
    }

    const duration = performance.now() - startTime;
    console.log(`📊 长任务执行完成: ${duration.toFixed(2)}ms, 计算结果: ${result.toFixed(2)}`);

    isSimulating.value = false;
    showToast(`长任务完成: ${duration.toFixed(0)}ms`, 'success');
  }, 100);
};

const simulateShortTasks = () => {
  console.log('⚡ 开始模拟多个短任务...');

  for (let index = 0; index < 5; index += 1) {
    window.setTimeout(() => {
      const startTime = performance.now();
      let result = 0;

      for (let count = 0; count < 1000000; count += 1) {
        result += count;
      }

      const duration = performance.now() - startTime;
      console.log(`短任务 ${index + 1} 完成: ${duration.toFixed(2)}ms, 结果: ${result}`);
    }, index * 200);
  }

  showToast('短任务队列已启动', 'success');
};

onMounted(async () => {
  await initPage();
  initPerformanceObserver();
});

onBeforeUnmount(() => {
  longTaskObserver?.disconnect();
});
</script>

<style scoped>
.reward-page {
  max-width: 480px;
  margin: 0 auto;
  padding: 16px;
  background: #f5f6fa;
  min-height: 100vh;
}

.page-header {
  text-align: center;
  padding: 24px 0;
  position: relative;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 700;
  color: #333;
  margin: 0 0 8px;
}

.subtitle {
  color: #666;
  font-size: 14px;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 12px;
  min-width: 88px;
  padding: 6px 12px;
  border-radius: 999px;
  background: #ff6b6b;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.user-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.user-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  margin-right: 12px;
}

.user-meta {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 16px;
  font-weight: 700;
  color: #333;
}

.user-level {
  font-size: 12px;
  color: #667eea;
  margin-top: 4px;
}

.loading-state,
.error-state,
.empty-state {
  padding: 32px 16px;
  text-align: center;
  color: #666;
}

.retry-btn {
  margin-top: 12px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: #667eea;
  color: #fff;
  cursor: pointer;
}

.reward-list {
  margin-bottom: 20px;
}

.longtask-section {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.longtask-section h3 {
  font-size: 18px;
  margin-bottom: 12px;
  color: #333;
}

.task-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.task-btn {
  flex: 1;
  border: none;
  border-radius: 12px;
  padding: 10px 14px;
  color: #fff;
  cursor: pointer;
}

.task-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.task-btn.danger {
  background: #ff6b6b;
}

.task-btn.info {
  background: #48bfe3;
}

.task-stats {
  color: #555;
  font-size: 14px;
  margin-bottom: 12px;
}

.task-list {
  display: grid;
  gap: 8px;
}

.task-item {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 10px;
  align-items: center;
  background: #f8f9fb;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 12px;
}

.task-name {
  color: #333;
  font-weight: 600;
}

.task-duration {
  color: #667eea;
}

.task-duration.high {
  color: #ff6b6b;
}

.task-time {
  color: #777;
}

.action-bar {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.action-btn {
  flex: 1;
  border: none;
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.action-btn.secondary {
  background: #fff;
  color: #333;
}

.action-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.toast {
  position: fixed;
  left: 50%;
  bottom: 32px;
  transform: translateX(-50%);
  padding: 10px 18px;
  border-radius: 999px;
  color: #fff;
  font-size: 14px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.toast.success {
  background: rgba(29, 209, 161, 0.95);
}

.toast.error {
  background: rgba(255, 107, 107, 0.95);
}
</style>
