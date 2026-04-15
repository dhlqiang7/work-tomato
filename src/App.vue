<template>
  <div class="app" :class="{ 'dark': isDark }" :data-theme="isDark ? 'dark' : 'light'">
    <AppHeader :is-dark="isDark" @toggle-theme="toggleTheme" @search="onSearch" />
    <div class="app-body">
      <Sidebar :active-view="currentView" @change-view="changeView" @start-task="onStartTask" />
      <main class="main-content">
        <TaskView v-if="currentView === 'tasks'" :search-keyword="searchKeyword" @start-pomodoro="onStartTask" />
        <ProjectView v-else-if="currentView === 'projects'" />
        <PomodoroView v-else-if="currentView === 'pomodoro'" :target-task="pomodoroTarget" />
        <StatsView v-else-if="currentView === 'stats'" @go-review="changeView('review')" />
        <ReviewView v-else-if="currentView === 'review'" />
      </main>
    </div>
    <Toast />
    <ShortcutHelp v-model="showShortcutHelp" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import AppHeader from './components/layout/AppHeader.vue'
import Sidebar from './components/layout/Sidebar.vue'
import TaskView from './views/TaskView.vue'
import ProjectView from './views/ProjectView.vue'
import PomodoroView from './views/PomodoroView.vue'
import StatsView from './views/StatsView.vue'
import ReviewView from './views/ReviewView.vue'
import Toast from './components/common/Toast.vue'
import ShortcutHelp from './components/common/ShortcutHelp.vue'

const currentView = ref('tasks')
const isDark = ref(false)
const searchKeyword = ref('')
const pomodoroTarget = ref(null)
const showShortcutHelp = ref(false)

const viewMap = { '1': 'tasks', '2': 'projects', '3': 'pomodoro', '4': 'stats', '5': 'review' }

function toggleTheme() {
  isDark.value = !isDark.value
  try { localStorage.setItem('theme', isDark.value ? 'dark' : 'light') } catch {}
}

watch(isDark, (val) => {
  document.documentElement.classList.toggle('dark', val)
}, { immediate: true })

function changeView(view) {
  currentView.value = view
}

function onSearch(kw) {
  searchKeyword.value = kw
  currentView.value = 'tasks'
}

function onStartTask(task) {
  pomodoroTarget.value = task
  currentView.value = 'pomodoro'
}

// 全局快捷键
function onKeydown(e) {
  // 忽略输入框内的按键
  const tag = e.target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  if (e.target.isContentEditable) return

  const key = e.key

  if (key === '?') {
    e.preventDefault()
    showShortcutHelp.value = !showShortcutHelp.value
    return
  }

  if (key === 'Escape') {
    showShortcutHelp.value = false
    return
  }

  // Ctrl/Cmd 组合键不处理
  if (e.ctrlKey || e.metaKey) return

  // 数字键 1-5 切换视图
  if (viewMap[key]) {
    e.preventDefault()
    changeView(viewMap[key])
    return
  }
}

onMounted(() => {
  const saved = localStorage.getItem('theme')
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    isDark.value = true
  }
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}
.main-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
