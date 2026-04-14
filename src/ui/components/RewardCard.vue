<!-- UI层：奖励卡片组件 -->
<template>
  <div class="reward-card" :class="statusClass">
    <div class="reward-icon">
      <img :src="reward.icon || defaultIcon" alt="reward" />
    </div>
    <div class="reward-info">
      <h3 class="reward-name">{{ reward.name }}</h3>
      <p class="reward-value">{{ displayValue }}</p>
      <p class="reward-desc">{{ reward.description }}</p>
    </div>
    <div class="reward-action">
      <button
        class="claim-btn"
        :class="buttonClass"
        :disabled="!canClaim"
        @click="handleClaim"
      >
        {{ buttonText }}
      </button>
    </div>
  </div>
</template>

<script>
// UI 层只负责展示和交互，不处理业务逻辑
// 所有业务逻辑委托给 Application 层
export default {
  name: 'RewardCard',

  props: {
    reward: {
      type: Object,
      required: true
    }
  },

  data() {
    return {
      defaultIcon: 'https://via.placeholder.com/60',
      loading: false
    };
  },

  computed: {
    // 根据奖励状态计算样式类
    statusClass() {
      return {
        'is-claimed': this.reward.isClaimed,
        'is-expired': this.reward.isExpired,
        'is-available': this.reward.isClaimable
      };
    },

    // 按钮样式
    buttonClass() {
      return {
        'btn-claimed': this.reward.isClaimed,
        'btn-expired': this.reward.isExpired,
        'btn-primary': this.reward.isClaimable,
        'loading': this.loading
      };
    },

    // 是否可以点击
    canClaim() {
      return this.reward.isClaimable && !this.loading;
    },

    // 按钮文本
    buttonText() {
      if (this.loading) return '领取中...';
      return this.reward.getButtonText?.() || '立即领取';
    },

    // 显示值
    displayValue() {
      return this.reward.getDisplayValue?.() || this.reward.value;
    }
  },

  methods: {
    // 处理领取点击 - 只负责触发事件，业务逻辑交给父组件
    handleClaim() {
      if (!this.canClaim) return;

      this.$emit('claim', {
        rewardId: this.reward.id,
        onStart: () => { this.loading = true; },
        onComplete: () => { this.loading = false; }
      });
    }
  }
};
</script>

<style scoped>
.reward-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
}

.reward-card.is-claimed {
  opacity: 0.7;
}

.reward-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  margin-right: 12px;
}

.reward-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.reward-info {
  flex: 1;
  min-width: 0;
}

.reward-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 4px;
}

.reward-value {
  font-size: 20px;
  font-weight: 700;
  color: #ff6b6b;
  margin: 0 0 4px;
}

.reward-desc {
  font-size: 12px;
  color: #999;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.claim-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 80px;
}

.claim-btn:disabled {
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-claimed {
  background: #e0e0e0;
  color: #999;
}

.btn-expired {
  background: #f5f5f5;
  color: #bbb;
  border: 1px solid #e0e0e0;
}

.claim-btn.loading {
  opacity: 0.7;
}
</style>
