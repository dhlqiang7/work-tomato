<template>
  <div class="view stats-view">
    <div class="view-toolbar">
      <h2 class="view-title">统计</h2>
    </div>

    <!-- 数据卡片 -->
    <div class="stats-cards">
      <div v-for="(s, i) in statCards" :key="s.label" class="stat-card card card-elevated"
        :style="{ animationDelay: i * 80 + 'ms' }">
        <div class="sc-icon">{{ s.icon }}</div>
        <div class="sc-value">{{ s.value }}<small v-if="s.unit">{{ s.unit }}</small></div>
        <div class="sc-label">{{ s.label }}</div>
      </div>
    </div>

    <!-- 每周专注柱状图 -->
    <div class="chart-section card card-elevated">
      <h3 class="section-title">最近 7 天专注时长</h3>
      <div class="bar-chart">
        <div v-for="d in weeklyFocus" :key="d.date" class="bar-item">
          <div class="bar-value" v-if="d.minutes > 0">{{ d.minutes }}<small>分</small></div>
          <div class="bar-track">
            <div class="bar-fill" :style="{ height: barHeight(d.minutes) + '%' }"></div>
          </div>
          <div class="bar-label">{{ d.date }}</div>
        </div>
      </div>
    </div>

    <!-- 快速回顾入口 -->
    <div class="quick-review card card-elevated" @click="$parent.$emit('changeView', 'review')">
      <span>📝 查看详细回顾与总结 →</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useApi } from '@/composables/useApi'

const { get } = useApi()
const dashboard = ref({
  todayDoneCount: 0, todayPendingCount: 0,
  todayPomodoroCount: 0, todayFocusMinutes: 0,
  streak: 0, weeklyFocus: []
})

const statCards = computed(() => [
  { icon: '✅', value: dashboard.value.todayDoneCount, label: '今日完成', unit: '' },
  { icon: '📋', value: dashboard.value.todayPendingCount, label: '待办任务', unit: '' },
  { icon: '🍅', value: dashboard.value.todayPomodoroCount, label: '今日番茄', unit: '' },
  { icon: '⏱', value: dashboard.value.todayFocusMinutes, label: '今日专注', unit: '分钟' },
  { icon: '🔥', value: dashboard.value.streak, label: '连续天数', unit: '天' },
])

const weeklyFocus = computed(() => dashboard.value.weeklyFocus)
const maxMinutes = computed(() => Math.max(...weeklyFocus.value.map(d => d.minutes), 1))

function barHeight(minutes) {
  return Math.max((minutes / maxMinutes.value) * 100, minutes > 0 ? 8 : 0)
}

async function load() {
  try {
    dashboard.value = await get('/stats/dashboard')
  } catch { /* ignore */ }
}

onMounted(load)
</script>

<style scoped>
.view { flex: 1; overflow-y: auto; padding: var(--sp-5); animation: fadeIn 0.3s var(--ease-smooth); }
.view-toolbar { margin-bottom: var(--sp-5); }
.view-title {
  font-family: var(--f-display); font-size: var(--fs-2xl);
  font-weight: var(--fw-bold); color: var(--c-text);
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--sp-4);
  margin-bottom: var(--sp-6);
}
.stat-card {
  padding: var(--sp-5);
  text-align: center;
  animation: slideUp 0.35s var(--ease-smooth) both;
}
.sc-icon { font-size: 28px; margin-bottom: var(--sp-2); }
.sc-value {
  font-family: var(--f-mono);
  font-size: var(--fs-3xl);
  font-weight: var(--fw-bold);
  color: var(--c-text);
  line-height: 1.1;
}
.sc-value small {
  font-size: var(--fs-sm);
  font-weight: var(--fw-normal);
  color: var(--c-text-2);
  margin-left: 3px;
}
.sc-label {
  font-size: var(--fs-sm);
  color: var(--c-text-2);
  margin-top: var(--sp-1);
}

/* Bar chart */
.chart-section {
  padding: var(--sp-5);
  margin-bottom: var(--sp-5);
}
.section-title {
  font-size: var(--fs-md);
  font-weight: var(--fw-semibold);
  margin-bottom: var(--sp-5);
  color: var(--c-text);
}
.bar-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 180px;
  gap: var(--sp-3);
  padding: 0 var(--sp-2);
}
.bar-item {
  flex: 1;
  display: flex; flex-direction: column; align-items: center;
  height: 100%;
  justify-content: flex-end;
}
.bar-value {
  font-size: var(--fs-xs);
  font-family: var(--f-mono);
  color: var(--c-text-2);
  margin-bottom: 4px;
}
.bar-value small { font-size: 10px; }
.bar-track {
  width: 100%;
  max-width: 40px;
  height: 140px;
  background: var(--c-bg);
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  position: relative;
  overflow: hidden;
}
.bar-fill {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: linear-gradient(to top, var(--c-primary), #E8943A);
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  transition: height 0.8s var(--ease-smooth);
  min-height: 4px;
}
.bar-label {
  font-size: var(--fs-xs);
  color: var(--c-text-3);
  margin-top: var(--sp-2);
}

.quick-review {
  padding: var(--sp-4) var(--sp-5);
  cursor: pointer;
  text-align: center;
  font-size: var(--fs-md);
  color: var(--c-primary);
  font-weight: var(--fw-medium);
  transition: all var(--t-fast);
}
.quick-review:hover {
  background: var(--c-primary-soft);
  transform: translateY(-1px);
}
</style>
