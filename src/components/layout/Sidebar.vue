<template>
  <aside class="sidebar">
    <nav class="sidebar-nav">
      <button
        v-for="item in navItems"
        :key="item.key"
        class="nav-item"
        :class="{ active: activeView === item.key }"
        @click="$emit('changeView', item.key)"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span class="nav-label">{{ item.label }}</span>
      </button>
    </nav>

    <!-- 提醒区域 -->
    <div v-if="reminders.length" class="sidebar-reminders">
      <div class="reminder-title">⚠️ 提醒</div>
      <div v-for="r in reminders" :key="r.id" class="reminder-item">
        <div class="reminder-text">{{ r.title }}</div>
        <div class="reminder-deadline">{{ formatDeadline(r.deadline) }}</div>
        <div class="reminder-actions">
          <button class="btn btn-sm" @click="$emit('startTask', r)">开始</button>
          <button class="btn btn-sm btn-ghost" @click="dismiss(r.id)">忽略</button>
        </div>
      </div>
    </div>

    <!-- 快捷键提示 -->
    <div class="sidebar-footer">
      <div class="shortcut-hint">按 <kbd>?</kbd> 查看快捷键</div>
    </div>
  </aside>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useApi } from '@/composables/useApi'

const { get, post } = useApi()

defineProps({ activeView: String })
defineEmits(['changeView', 'startTask'])

const navItems = [
  { key: 'tasks',    icon: '📋', label: '任务' },
  { key: 'projects', icon: '📁', label: '项目' },
  { key: 'pomodoro', icon: '🍅', label: '专注' },
  { key: 'stats',    icon: '📊', label: '统计' },
  { key: 'review',   icon: '📝', label: '回顾' },
]

const reminders = ref([])
let timer = null

async function loadReminders() {
  try {
    reminders.value = await get('/tasks/reminders/list')
  } catch { /* ignore */ }
}

async function dismiss(id) {
  try {
    await post(`/tasks/${id}/dismiss-reminder`)
    reminders.value = reminders.value.filter(r => r.id !== id)
  } catch { /* ignore */ }
}

function formatDeadline(d) {
  if (!d) return ''
  const date = new Date(d)
  const now = new Date()
  const diffMs = date - now
  if (diffMs < 0) return `已过期 ${Math.abs(Math.round(diffMs / 3600000))} 小时`
  if (diffMs < 3600000) return `${Math.round(diffMs / 60000)} 分钟后到期`
  return '今天到期'
}

onMounted(() => {
  loadReminders()
  timer = setInterval(loadReminders, 60000)
})
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-w);
  border-right: 1px solid var(--c-border);
  background: var(--c-surface);
  display: flex; flex-direction: column;
  flex-shrink: 0;
  overflow-y: auto;
}
.sidebar-nav {
  padding: var(--sp-3) var(--sp-3);
  display: flex; flex-direction: column; gap: 2px;
}
.nav-item {
  display: flex; align-items: center; gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
  border: none; border-radius: var(--radius-md);
  background: transparent;
  color: var(--c-text-2);
  font-size: var(--fs-base);
  font-family: var(--f-body);
  font-weight: var(--fw-medium);
  cursor: pointer;
  transition: all var(--t-fast) var(--ease-smooth);
  text-align: left;
  width: 100%;
  position: relative;
}
.nav-item:hover {
  background: var(--c-primary-soft);
  color: var(--c-text);
}
.nav-item.active {
  background: var(--c-primary-soft);
  color: var(--c-primary);
  font-weight: var(--fw-semibold);
}
.nav-item.active::before {
  content: '';
  position: absolute; left: 0; top: 6px; bottom: 6px;
  width: 3px;
  background: var(--c-primary);
  border-radius: 0 2px 2px 0;
}
.nav-icon { font-size: 17px; flex-shrink: 0; width: 22px; text-align: center; }
.nav-label { flex: 1; }

.sidebar-reminders {
  padding: var(--sp-3);
  margin: auto var(--sp-3) var(--sp-3);
  border-top: 1px solid var(--c-border);
  display: flex; flex-direction: column; gap: var(--sp-2);
}
.reminder-title {
  font-size: var(--fs-xs);
  font-weight: var(--fw-semibold);
  color: var(--c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--sp-1);
}
.reminder-item {
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--radius-md);
  background: var(--c-primary-soft);
  border-left: 3px solid var(--c-primary);
}
.reminder-text {
  font-size: var(--fs-sm);
  font-weight: var(--fw-medium);
  color: var(--c-text);
  margin-bottom: 2px;
}
.reminder-deadline {
  font-size: var(--fs-xs);
  color: var(--c-primary);
  margin-bottom: var(--sp-1);
}
.reminder-actions {
  display: flex; gap: var(--sp-1);
}
.reminder-actions .btn-sm { font-size: var(--fs-xs); padding: 2px 8px; }

.sidebar-footer {
  padding: var(--sp-3);
  border-top: 1px solid var(--c-border);
  margin-top: auto;
}
.shortcut-hint {
  font-size: var(--fs-xs);
  color: var(--c-text-3);
  text-align: center;
}
.shortcut-hint kbd {
  display: inline-block;
  padding: 1px 5px;
  border: 1px solid var(--c-border);
  border-radius: 4px;
  font-family: var(--f-mono);
  font-size: 11px;
  background: var(--c-bg);
}
</style>
