<template>
  <div class="view pomodoro-view">
    <div class="pomodoro-layout">
      <!-- 番茄钟主体 -->
      <div class="pomodoro-main">
        <!-- 任务选择 -->
        <div class="task-selector" v-if="!running">
          <label class="form-label">选择任务</label>
          <select v-model="selectedTaskId" class="select">
            <option value="">-- 选择要专注的任务 --</option>
            <option v-for="t in pendingTasks" :key="t.id" :value="t.id">{{ t.title }}</option>
          </select>
        </div>

        <!-- 环形计时器 -->
        <div class="timer-container" :class="{ 'is-running': running, 'is-work': phase === 'work', 'is-break': phase !== 'work' }">
          <svg class="timer-ring" viewBox="0 0 220 220">
            <circle class="ring-bg" cx="110" cy="110" r="100" />
            <circle class="ring-progress" cx="110" cy="110" r="100"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="circumference * (1 - progress)" />
          </svg>
          <div class="timer-center">
            <div class="timer-phase">{{ phaseLabel }}</div>
            <div class="timer-display">{{ displayTime }}</div>
            <div v-if="currentTask" class="timer-task">{{ currentTask.title }}</div>
          </div>
        </div>

        <!-- 控制按钮 -->
        <div class="timer-controls">
          <template v-if="!running && !paused">
            <button class="btn btn-primary btn-lg timer-start" @click="startTimer">
              🍅 开始专注
            </button>
          </template>
          <template v-else>
            <button class="btn btn-lg" @click="togglePause">
              {{ paused ? '▶ 继续' : '⏸ 暂停' }}
            </button>
            <button class="btn btn-lg" @click="stopTimer(false)">⏹ 放弃</button>
            <button v-if="phase === 'work'" class="btn btn-primary btn-lg" @click="stopTimer(true)">✓ 完成</button>
          </template>
        </div>

        <!-- 番茄计数 -->
        <div class="pomodoro-count" v-if="todayCount > 0">
          <span v-for="n in todayCount" :key="n" class="pomodoro-dot">🍅</span>
        </div>
      </div>

      <!-- 今日统计侧栏 -->
      <div class="pomodoro-sidebar">
        <div class="stat-card card">
          <div class="stat-icon">🍅</div>
          <div class="stat-value">{{ todayCount }}</div>
          <div class="stat-label">今日番茄</div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">⏱</div>
          <div class="stat-value">{{ todayMinutes }}<small>分钟</small></div>
          <div class="stat-label">今日专注</div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">✅</div>
          <div class="stat-value">{{ todayDoneCount }}</div>
          <div class="stat-label">今日完成</div>
        </div>
      </div>
    </div>
    <ConfirmDialog ref="confirmDialog" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

const { get, post, put } = useApi()
const toast = useToast()
const confirmDialog = ref(null)

const props = defineProps({ targetTask: Object })
const emit = defineEmits(['taskCompleted'])

const pendingTasks = ref([])
const selectedTaskId = ref('')
const currentPomodoroId = ref(null)
const currentTask = ref(null)

// Timer state
const phase = ref('work') // work | break | longbreak
const totalSeconds = ref(25 * 60)
const remainingSeconds = ref(25 * 60)
const running = ref(false)
const paused = ref(false)
let interval = null

const todayCount = ref(0)
const todayMinutes = ref(0)
const todayDoneCount = ref(0)

const circumference = 2 * Math.PI * 100

const progress = computed(() => 1 - remainingSeconds.value / totalSeconds.value)
const displayTime = computed(() => {
  const m = Math.floor(remainingSeconds.value / 60)
  const s = remainingSeconds.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})
const phaseLabel = computed(() => {
  return { 'work': '专注中', 'break': '短休息', 'longbreak': '长休息' }[phase.value] || '专注'
})

async function load() {
  pendingTasks.value = await get('/tasks?status=pending')
  const stats = await get('/stats/dashboard')
  todayCount.value = stats.todayPomodoroCount
  todayMinutes.value = stats.todayFocusMinutes
  todayDoneCount.value = stats.todayDoneCount
}

// 如果从任务页传来的任务，自动选中
watch(() => props.targetTask, (t) => {
  if (t) {
    selectedTaskId.value = t.id
    currentTask.value = t
  } else {
    selectedTaskId.value = ''
    currentTask.value = null
  }
}, { immediate: true })

async function startTimer() {
  const taskId = selectedTaskId.value || null
  currentTask.value = pendingTasks.value.find(t => t.id === taskId) || null

  try {
    const pom = await post('/pomodoros/start', { taskId, type: phase.value })
    currentPomodoroId.value = pom.id
    totalSeconds.value = pom.plannedMinutes * 60
    remainingSeconds.value = pom.plannedMinutes * 60
    running.value = true
    paused.value = false
    startCountdown()
  } catch (e) {
    toast.error(e.message)
  }
}

function startCountdown() {
  clearInterval(interval)
  interval = setInterval(() => {
    if (paused.value) return
    remainingSeconds.value--
    updateDocTitle()
    if (remainingSeconds.value <= 0) {
      clearInterval(interval)
      onTimerComplete()
    }
  }, 1000)
}

function updateDocTitle() {
  if (running.value) {
    document.title = `🍅 ${displayTime.value} - ${currentTask.value?.title || 'Tomato'}`
  } else {
    document.title = 'Tomato - 个人工作助理'
  }
}

async function onTimerComplete() {
  running.value = false
  try {
    await put(`/pomodoros/${currentPomodoroId.value}/stop`, { completed: true })
  } catch (e) {
    toast.error('保存番茄钟记录失败')
    resetToWork()
    document.title = 'Tomato - 个人工作助理'
    return
  }

  // 从服务器刷新真实数据
  await load()

  if (phase.value === 'work') {
    toast.success('番茄钟完成！休息一下吧 🎉')
    const nextPhase = todayCount.value % 4 === 0 ? 'longbreak' : 'break'
    phase.value = nextPhase
    totalSeconds.value = nextPhase === 'longbreak' ? 15 * 60 : 5 * 60
    remainingSeconds.value = totalSeconds.value
  } else {
    toast.success('休息结束，继续下一个番茄 🍅')
    phase.value = 'work'
    totalSeconds.value = 25 * 60
    remainingSeconds.value = 25 * 60
  }
}

async function togglePause() {
  const prev = paused.value
  paused.value = !prev
  try {
    if (paused.value) {
      await put(`/pomodoros/${currentPomodoroId.value}/pause`)
    } else {
      await put(`/pomodoros/${currentPomodoroId.value}/resume`)
    }
  } catch (e) {
    paused.value = prev  // 回滚状态
    toast.error(prev ? '继续失败' : '暂停失败')
  }
}

function resetToWork() {
  phase.value = 'work'
  totalSeconds.value = 25 * 60
  remainingSeconds.value = totalSeconds.value
}

async function stopTimer(completed) {
  if (!completed) {
    if (!await confirmDialog.value?.show('确定放弃当前番茄钟？本次专注将不会被记录。')) return
  }
  clearInterval(interval)
  running.value = false
  paused.value = false
  document.title = 'Tomato - 个人工作助理'
  try {
    await put(`/pomodoros/${currentPomodoroId.value}/stop`, { completed })
    if (completed) {
      toast.success('番茄钟完成！')
    } else {
      toast.warning('已放弃当前番茄钟')
    }
  } catch (e) { toast.error('操作失败') }
  resetToWork()
  await load()
}

onMounted(load)
onUnmounted(() => {
  clearInterval(interval)
  document.title = 'Tomato - 个人工作助理'
})
</script>

<style scoped>
.view { flex: 1; overflow-y: auto; animation: fadeIn 0.3s var(--ease-smooth); }
.pomodoro-layout {
  display: flex; gap: var(--sp-6);
  max-width: 900px; margin: 0 auto;
  padding: var(--sp-8);
  align-items: flex-start;
}
.pomodoro-main {
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center; gap: var(--sp-6);
}
.task-selector {
  width: 100%; max-width: 360px;
  text-align: left;
}

/* Timer ring */
.timer-container {
  position: relative;
  width: 260px; height: 260px;
  display: flex; align-items: center; justify-content: center;
  transition: all var(--t-slow) var(--ease-smooth);
}
.timer-container.is-work.is-running {
  filter: drop-shadow(0 0 30px rgba(217, 79, 59, 0.2));
}
.timer-ring {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  transform: rotate(-90deg);
}
.ring-bg {
  fill: none;
  stroke: var(--c-border);
  stroke-width: 8;
}
.ring-progress {
  fill: none;
  stroke: var(--c-primary);
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dashoffset 1s linear;
}
.is-break .ring-progress {
  stroke: var(--c-green);
}

.timer-center {
  text-align: center;
  z-index: 1;
}
.timer-phase {
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  color: var(--c-primary);
  margin-bottom: var(--sp-1);
  letter-spacing: 0.05em;
}
.is-break .timer-phase { color: var(--c-green); }
.timer-display {
  font-family: var(--f-mono);
  font-size: var(--fs-4xl);
  font-weight: var(--fw-bold);
  color: var(--c-text);
  line-height: 1;
  letter-spacing: -0.02em;
}
.timer-task {
  font-size: var(--fs-sm);
  color: var(--c-text-2);
  margin-top: var(--sp-2);
  max-width: 180px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* Controls */
.timer-controls {
  display: flex; gap: var(--sp-3);
  align-items: center;
}
.timer-start {
  min-width: 160px;
}

/* Pomodoro dots */
.pomodoro-count {
  display: flex; gap: var(--sp-2);
  font-size: 20px;
}

/* Sidebar stats */
.pomodoro-sidebar {
  display: flex; flex-direction: column; gap: var(--sp-3);
  width: 180px;
  flex-shrink: 0;
}
.stat-card {
  text-align: center;
  padding: var(--sp-5) var(--sp-4);
  animation: slideUp 0.3s var(--ease-smooth) both;
}
.stat-card:nth-child(2) { animation-delay: 60ms; }
.stat-card:nth-child(3) { animation-delay: 120ms; }
.stat-icon { font-size: 28px; margin-bottom: var(--sp-2); }
.stat-value {
  font-family: var(--f-mono);
  font-size: var(--fs-2xl);
  font-weight: var(--fw-bold);
  color: var(--c-text);
  line-height: 1.1;
}
.stat-value small {
  font-size: var(--fs-xs);
  font-weight: var(--fw-normal);
  color: var(--c-text-2);
  margin-left: 2px;
}
.stat-label {
  font-size: var(--fs-xs);
  color: var(--c-text-3);
  margin-top: var(--sp-1);
}

/* Running pulse animation */
.is-work.is-running .ring-progress {
  animation: pulse 2s ease-in-out infinite;
}

@media (max-width: 700px) {
  .pomodoro-layout { flex-direction: column; align-items: center; }
  .pomodoro-sidebar { flex-direction: row; width: 100%; }
  .stat-card { flex: 1; }
}
</style>
