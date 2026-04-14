<!-- UI层：奖励列表页面 -->
<template>
  <div class="reward-page">
    <!-- 页面头部 -->
    <header class="page-header">
      <h1>会员福利中心</h1>
      <p class="subtitle">{{ platformText }}端专享权益</p>
      <div v-if="claimableCount > 0" class="badge">
        {{ claimableCount }}个待领取
      </div>
    </header>

    <!-- 用户信息卡片 -->
    <div v-if="userInfo" class="user-card">
      <img :src="userInfo.avatar || defaultAvatar" class="user-avatar" alt="avatar" />
      <div class="user-meta">
        <span class="user-name">{{ userInfo.name || '游客' }}</span>
        <span class="user-level">{{ levelName }}</span>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <p>加载中...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="retry-btn" @click="loadRewardList">重新加载</button>
    </div>

    <!-- 奖励列表 -->
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

    <!-- 操作按钮区 -->
    <div class="action-bar">
      <button class="action-btn secondary" @click="goBack">返回</button>
      <button class="action-btn primary" @click="refresh">刷新列表</button>
    </div>

    <!-- 结果提示 -->
    <div v-if="toastMessage" class="toast" :class="toastType">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script>
// UI 层只负责：
// 1. 页面渲染
// 2. 用户交互事件转发
// 3. 状态展示（loading、error、empty）
// 所有业务逻辑都委托给 Application 层的 RewardService

import { rewardService } from '@/application';
import platform from '@/adapter/platform';
import router from '@/adapter/router';
import storage from '@/adapter/storage';
import RewardCard from '../components/RewardCard.vue';

export default {
  name: 'RewardPage',

  components: {
    RewardCard
  },

  data() {
    return {
      // 页面状态
      loading: false,
      error: null,
      toastMessage: '',
      toastType: 'success',

      // 数据
      rewardList: [],
      userInfo: null,
      defaultAvatar: 'https://via.placeholder.com/40'
    };
  },

  computed: {
    // 可领取数量
    claimableCount() {
      return this.rewardList.filter(r => r.isClaimable?.()).length;
    },

    // 平台显示文本
    platformText() {
      const map = {
        h5: 'H5',
        android: 'Android',
        ios: 'iOS',
        wechat: '微信小程序'
      };
      return map[platform.type] || 'H5';
    },

    // 用户等级名称
    levelName() {
      const levels = ['普通用户', '铜牌会员', '银牌会员', '金牌会员', '钻石会员'];
      return levels[this.userInfo?.level || 0] || '普通用户';
    }
  },

  created() {
    this.initPage();
  },

  methods: {
    // 初始化页面
    async initPage() {
      // 获取用户信息
      this.userInfo = storage.get('user_info') || {
        name: '测试用户',
        level: 1,
        avatar: ''
      };

      // 加载奖励列表
      await this.loadRewardList();
    },

    // 加载奖励列表 - 委托给 Application 层
    async loadRewardList() {
      this.loading = true;
      this.error = null;

      try {
        // UI 层只关心：调用 service 获取数据，不关心内部实现
        this.rewardList = await rewardService.getRewardList();
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },

    // 处理领取 - 委托给 Application 层
    async handleClaim({ rewardId, onStart, onComplete }) {
      onStart?.();

      try {
        // 所有业务逻辑（资格检查、API调用、状态更新）都在 Application 层处理
        const result = await rewardService.claimReward(rewardId);

        // UI 层只处理结果展示
        if (result.success) {
          this.showToast(result.message, 'success');
          // 触发视图更新
          this.$forceUpdate();
        } else {
          this.showToast(result.message, 'error');
        }
      } finally {
        onComplete?.();
      }
    },

    // 刷新列表
    async refresh() {
      await this.loadRewardList();
      this.showToast('已刷新', 'success');
    },

    // 返回上一页 - 使用 Adapter 层的路由
    goBack() {
      router.back();
    },

    // 显示提示
    showToast(message, type = 'success') {
      this.toastMessage = message;
      this.toastType = type;
      setTimeout(() => {
        this.toastMessage = '';
      }, 3000);
    }
  }
};
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
  font-size: 14px;
  color: #666;
  margin: 0;
}

.badge {
  position: absolute;
  top: 20px;
  right: 0;
  background: #ff6b6b;
  color: #fff;
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 12px;
}

.user-card {
  display: flex;
  align-items: center;
  background: #fff;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 12px;
}

.user-meta {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.user-level {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.reward-list {
  margin-bottom: 16px;
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 48px 16px;
  color: #999;
}

.retry-btn {
  margin-top: 16px;
  padding: 8px 24px;
  background: #667eea;
  color: #fff;
  border: none;
  border-radius: 20px;
  cursor: pointer;
}

.action-bar {
  display: flex;
  gap: 12px;
  padding: 16px 0;
}

.action-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.action-btn.secondary {
  background: #f0f0f0;
  color: #666;
}

.toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  color: #fff;
  z-index: 1000;
  animation: fadeInUp 0.3s ease;
}

.toast.success {
  background: rgba(0, 0, 0, 0.8);
}

.toast.error {
  background: rgba(255, 107, 107, 0.9);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>
