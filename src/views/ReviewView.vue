<template>
  <div class="view review-view">
    <div class="view-toolbar">
      <h2 class="view-title">回顾</h2>
      <div class="period-tabs">
        <button v-for="p in periods" :key="p.key" class="period-tab"
          :class="{ active: currentPeriod === p.key }"
          @click="changePeriod(p.key)">
          {{ p.label }}
        </button>
      </div>
    </div>

    <!-- 自定义日期 -->
    <div v-if="currentPeriod === 'custom'" class="custom-range">
      <input v-model="customStart" type="date" class="input" style="width:auto" />
      <span>至</span>
      <input v-model="customEnd" type="date" class="input" style="width:auto" />
      <button class="btn btn-primary btn-sm" @click="load">查询</button>
    </div>

    <!-- 统计摘要 -->
    <div v-if="data.stats" class="summary-cards">
      <div class="summary-item">
        <span class="summary-value">{{ data.stats.totalDone }}</span>
        <span class="summary-label">完成任务</span>
      </div>
      <div class="summary-item">
        <span class="summary-value">{{ data.stats.totalPomodoros }}</span>
        <span class="summary-label">番茄数</span>
      </div>
      <div class="summary-item">
        <span class="summary-value">{{ data.stats.totalFocusMinutes }}<small>分</small></span>
        <span class="summary-label">专注时长</span>
      </div>
    </div>

    <!-- 完成的任务列表 -->
    <div class="review-list" v-if="data.tasks?.length">
      <h3 class="list-title">完成的工作</h3>
      <div v-for="task in data.tasks" :key="task.id" class="review-item card">
        <div class="ri-check">✓</div>
        <div class="ri-body">
          <div class="ri-title">{{ task.title }}</div>
          <div v-if="task.completedResult" class="ri-result">{{ task.completedResult }}</div>
          <div class="ri-meta">
            <span v-if="task.projectTitle" class="ri-project">📁 {{ task.projectTitle }}</span>
            <span class="ri-time">{{ formatTime(task.completedAt) }}</span>
            <span v-if="task.totalFocusMinutes" class="ri-focus">🍅 {{ task.totalFocusMinutes }}分钟</span>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="empty-state">
      <div class="icon">📝</div>
      <div class="title">该时段暂无完成记录</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useApi } from '@/composables/useApi'

const { get } = useApi()

const periods = [
  { key: 'today', label: '今日' },
  { key: 'week', label: '近7天' },
  { key: 'month', label: '本月' },
  { key: 'month30', label: '近30天' },
  { key: 'halfyear', label: '半年' },
  { key: 'year', label: '全年' },
  { key: 'custom', label: '自定义' },
]

const currentPeriod = ref('today')
const customStart = ref('')
const customEnd = ref('')
const data = ref({ tasks: [], stats: null })

async function load() {
  try {
    const params = new URLSearchParams({ period: currentPeriod.value })
    if (currentPeriod.value === 'custom') {
      if (customStart.value) params.set('start', customStart.value)
      if (customEnd.value) params.set('end', customEnd.value)
    }
    data.value = await get('/stats/review?' + params.toString())

    // 附加项目名称
    const projects = await get('/projects')
    const map = Object.fromEntries(projects.map(p => [p.id, p.title]))
    data.value.tasks = (data.value.tasks || []).map(t => ({
      ...t, projectTitle: map[t.projectId] || '日常工作'
    }))
  } catch { /* ignore */ }
}

function changePeriod(key) {
  currentPeriod.value = key
  load()
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

onMounted(load)
</script>

<style scoped>
.view { flex: 1; overflow-y: auto; padding: var(--sp-5); animation: fadeIn 0.3s var(--ease-smooth); }
.view-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: var(--sp-5); flex-wrap: wrap; gap: var(--sp-3);
}
.view-title {
  font-family: var(--f-display); font-size: var(--fs-2xl);
  font-weight: var(--fw-bold); color: var(--c-text);
}
.period-tabs {
  display: flex; gap: 2px;
  background: var(--c-bg);
  border-radius: var(--radius-md);
  padding: 3px;
  border: 1px solid var(--c-border);
}
.period-tab {
  padding: var(--sp-1) var(--sp-3);
  border: none; border-radius: var(--radius-sm);
  background: transparent;
  color: var(--c-text-2);
  font-size: var(--fs-sm);
  font-family: var(--f-body);
  font-weight: var(--fw-medium);
  cursor: pointer;
  transition: all var(--t-fast) var(--ease-smooth);
}
.period-tab:hover { color: var(--c-text); }
.period-tab.active {
  background: var(--c-surface);
  color: var(--c-primary);
  box-shadow: var(--shadow-sm);
}

.custom-range {
  display: flex; align-items: center; gap: var(--sp-3);
  margin-bottom: var(--sp-5);
  font-size: var(--fs-sm); color: var(--c-text-2);
}
.custom-range .input { width: 160px; }

/* Summary */
.summary-cards {
  display: flex; gap: var(--sp-6);
  margin-bottom: var(--sp-6);
  padding: var(--sp-5) var(--sp-6);
  background: var(--c-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--c-border);
}
.summary-item {
  display: flex; flex-direction: column; align-items: center;
}
.summary-value {
  font-family: var(--f-mono);
  font-size: var(--fs-3xl);
  font-weight: var(--fw-bold);
  color: var(--c-text);
  line-height: 1.1;
}
.summary-value small { font-size: var(--fs-sm); font-weight: var(--fw-normal); color: var(--c-text-2); }
.summary-label { font-size: var(--fs-sm); color: var(--c-text-2); margin-top: var(--sp-1); }

/* Review list */
.list-title {
  font-size: var(--fs-md);
  font-weight: var(--fw-semibold);
  margin-bottom: var(--sp-3);
  color: var(--c-text);
}
.review-list { display: flex; flex-direction: column; gap: var(--sp-2); }

.review-item {
  display: flex; align-items: flex-start; gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
}
.ri-check {
  width: 24px; height: 24px;
  background: var(--c-green-soft);
  color: var(--c-green);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: var(--fw-bold);
  flex-shrink: 0;
  margin-top: 2px;
}
.ri-body { flex: 1; min-width: 0; }
.ri-title {
  font-weight: var(--fw-medium);
  font-size: var(--fs-md);
  color: var(--c-text);
}
.ri-result {
  font-size: var(--fs-sm);
  color: var(--c-text-2);
  margin-top: var(--sp-1);
  padding: var(--sp-2) var(--sp-3);
  background: var(--c-bg);
  border-radius: var(--radius-sm);
  line-height: var(--lh-relaxed);
}
.ri-meta {
  display: flex; gap: var(--sp-3);
  margin-top: var(--sp-1);
  font-size: var(--fs-xs);
  color: var(--c-text-3);
}
</style>
