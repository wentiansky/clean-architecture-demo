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
      <img
        :src="userInfo.avatar || defaultAvatar"
        class="user-avatar"
        alt="avatar"
      />
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

    <!-- 长任务测试区域 -->
    <div class="longtask-section">
      <h3>⏱️ 长任务监控测试</h3>

      <div class="task-buttons">
        <button
          class="task-btn danger"
          @click="simulateLongTask"
          :disabled="isSimulating"
        >
          {{ isSimulating ? '执行中...' : '模拟长任务' }}
        </button>
        <button class="task-btn info" @click="simulateShortTasks">
          模拟短任务队列
        </button>
      </div>

      <div class="task-stats">
        <p>
          检测到 <strong>{{ longTasks.length }}</strong> 个长任务 (Long Task >
          50ms)
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

import { rewardService } from '@/application'
import platform from '@/adapter/platform'
import router from '@/adapter/router'
import storage from '@/adapter/storage'
import RewardCard from '../components/RewardCard.vue'

export default {
  name: 'RewardPage',

  components: {
    RewardCard,
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
      defaultAvatar: 'https://via.placeholder.com/40',

      // 长任务监控
      longTasks: [],
      isSimulating: false,
    }
  },

  computed: {
    // 可领取数量
    claimableCount() {
      return this.rewardList.filter((r) => r.isClaimable?.()).length
    },

    // 平台显示文本
    platformText() {
      const map = {
        h5: 'H5',
        android: 'Android',
        ios: 'iOS',
        wechat: '微信小程序',
      }
      return map[platform.type] || 'H5'
    },

    // 用户等级名称
    levelName() {
      const levels = [
        '普通用户',
        '铜牌会员',
        '银牌会员',
        '金牌会员',
        '钻石会员',
      ]
      return levels[this.userInfo?.level || 0] || '普通用户'
    },
  },

  created() {
    this.initPage()
    this.initPerformanceObserver()
  },

  beforeDestroy() {
    // 清理 PerformanceObserver
    if (this.longTaskObserver) {
      this.longTaskObserver.disconnect()
    }
  },

  methods: {
    // 初始化页面
    async initPage() {
      // 获取用户信息
      this.userInfo = storage.get('user_info') || {
        name: '测试用户',
        level: 1,
        avatar: '',
      }

      // 加载奖励列表
      await this.loadRewardList()
    },

    // 加载奖励列表 - 委托给 Application 层
    async loadRewardList() {
      this.loading = true
      this.error = null

      try {
        // UI 层只关心：调用 service 获取数据，不关心内部实现
        this.rewardList = await rewardService.getRewardList()
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    // 处理领取 - 委托给 Application 层
    async handleClaim({ rewardId, onStart, onComplete }) {
      onStart?.()

      try {
        // 所有业务逻辑（资格检查、API调用、状态更新）都在 Application 层处理
        const result = await rewardService.claimReward(rewardId)

        // UI 层只处理结果展示
        if (result.success) {
          this.showToast(result.message, 'success')
          // 触发视图更新
          this.$forceUpdate()
        } else {
          this.showToast(result.message, 'error')
        }
      } finally {
        onComplete?.()
      }
    },

    // 刷新列表
    async refresh() {
      await this.loadRewardList()
      this.showToast('已刷新', 'success')
    },

    // 返回上一页 - 使用 Adapter 层的路由
    goBack() {
      router.back()
    },

    // 显示提示
    showToast(message, type = 'success') {
      this.toastMessage = message
      this.toastType = type
      setTimeout(() => {
        this.toastMessage = ''
      }, 3000)
    },

    // 初始化 PerformanceObserver 监听长任务
    initPerformanceObserver() {
      if (!('PerformanceObserver' in window)) {
        console.warn('当前浏览器不支持 PerformanceObserver')
        return
      }

      try {
        // 创建长任务观察者
        this.longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const taskInfo = {
              name: entry.name,
              duration: entry.duration,
              startTime: entry.startTime,
              entryType: entry.entryType,
              id: Date.now() + Math.random(),
            }

            // 添加到列表（只保留最近10条）
            this.longTasks.unshift(taskInfo)
            if (this.longTasks.length > 10) {
              this.longTasks.pop()
            }

            // 详细控制台输出 - 分组显示
            console.group(
              `🐌 长任务 #${this.longTasks.length} - ${entry.duration.toFixed(2)}ms @ ${entry.startTime.toFixed(0)}ms`,
            )

            // 1. 基本信息
            console.log('%c基本信息:', 'color: #667eea; font-weight: bold')
            console.table({
              名称: entry.name,
              持续时间: `${entry.duration.toFixed(2)}ms`,
              开始时间: `${entry.startTime.toFixed(2)}ms`,
              结束时间: `${(entry.startTime + entry.duration).toFixed(2)}ms`,
              类型: entry.entryType,
              归因数量: entry.attribution?.length || 0,
            })

            // 2. 完整的 entry 对象
            console.log('%c完整 entry 对象:', 'color: #48dbfb; font-weight: bold')
            console.log('entry.toJSON():', entry.toJSON())
            console.log('entry 实例:', entry)

            // 3. 归因详情 - 最关键的信息！
            if (entry.attribution && entry.attribution.length > 0) {
              console.log(
                '%c归因详情 (attribution) - 揭示长任务来源:',
                'color: #ff6b6b; font-weight: bold',
              )
              entry.attribution.forEach((attr, idx) => {
                console.group(`归因 #${idx + 1}`)
                console.log('容器类型:', attr.containerType)
                console.log('容器名称:', attr.containerName)
                console.log('容器Src:', attr.containerSrc)
                console.log('容器ID:', attr.containerId)
                console.log('脚本URL:', attr.scriptUrl || '内联脚本/当前页面')
                console.log('行号:', attr.lineNumber)
                console.log('列号:', attr.columnNumber)
                console.log('函数名:', attr.functionName || '匿名函数')
                console.log('执行上下文:', attr.executionContext)
                console.log('类型:', attr.type)
                console.groupEnd()
              })
            } else {
              console.log(
                '%c无归因信息 - 可能是浏览器内部操作或无法追踪的脚本',
                'color: #feca57; font-weight: bold',
              )
            }

            // 4. 根据时间戳推测任务类型
            console.log('%c任务来源推测:', 'color: #1dd1a1; font-weight: bold')
            const startTime = entry.startTime
            if (startTime < 500) {
              console.log('📌 可能是: 浏览器初始化 / Vue 框架启动 / 脚本加载解析')
            } else if (startTime < 1500) {
              console.log('📌 可能是: 组件挂载 / 数据初始化 / 首次渲染')
            } else if (startTime < 3000) {
              console.log('📌 可能是: 异步数据获取 / API响应处理 / 列表渲染')
            } else {
              console.log('📌 可能是: 用户交互响应 / 点击事件处理')
            }

            console.groupEnd()
          }
        })

        // 开始监听长任务
        this.longTaskObserver.observe({ entryTypes: ['longtask'] })
        console.log('✅ PerformanceObserver 长任务监控已启动')
        console.log('%c提示: 刷新页面查看加载时的长任务详情', 'color: #1dd1a1')
      } catch (err) {
        console.error('PerformanceObserver 初始化失败:', err)
      }
    },

    // 模拟长任务 - 执行大量计算阻塞主线程
    simulateLongTask() {
      this.isSimulating = true
      console.log('🚀 开始模拟长任务...')

      // 使用 requestIdleCallback 或 setTimeout 确保 UI 先更新
      setTimeout(() => {
        const startTime = performance.now()

        // 执行大量计算来模拟长任务
        // 长任务定义为执行时间超过 50ms 的任务
        let result = 0
        for (let i = 0; i < 100000000; i++) {
          result += Math.sqrt(i) * Math.sin(i)
        }

        const duration = performance.now() - startTime
        console.log(
          `📊 长任务执行完成: ${duration.toFixed(
            2,
          )}ms, 计算结果: ${result.toFixed(2)}`,
        )

        this.isSimulating = false
        this.showToast(`长任务完成: ${duration.toFixed(0)}ms`, 'success')
      }, 100)
    },

    // 模拟多个短任务
    simulateShortTasks() {
      console.log('⚡ 开始模拟多个短任务...')

      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          const startTime = performance.now()
          let result = 0
          // 每次只做少量计算（少于 50ms）
          for (let j = 0; j < 1000000; j++) {
            result += j
          }
          const duration = performance.now() - startTime
          console.log(`短任务 ${i + 1} 完成: ${duration.toFixed(2)}ms`)
        }, i * 200)
      }

      this.showToast('短任务队列已启动', 'success')
    },
  },
}
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

/* 长任务监控区域样式 */
.longtask-section {
  background: #fff;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.longtask-section h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.task-btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.task-btn.danger {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
  color: #fff;
}

.task-btn.info {
  background: linear-gradient(135deg, #48dbfb 0%, #0abde3 100%);
  color: #fff;
}

.task-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.task-stats {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.task-stats strong {
  color: #ff6b6b;
  font-size: 18px;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.task-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #f8f9fa;
  border-radius: 8px;
  font-size: 13px;
}

.task-name {
  color: #666;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-duration {
  font-weight: 600;
  color: #667eea;
  padding: 2px 8px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 12px;
  margin: 0 8px;
}

.task-duration.high {
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
}

.task-time {
  color: #999;
  font-size: 12px;
}
</style>
