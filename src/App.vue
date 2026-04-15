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
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import AppHeader from './components/layout/AppHeader.vue'
import Sidebar from './components/layout/Sidebar.vue'
import TaskView from './views/TaskView.vue'
import ProjectView from './views/ProjectView.vue'
import PomodoroView from './views/PomodoroView.vue'
import StatsView from './views/StatsView.vue'
import ReviewView from './views/ReviewView.vue'
import Toast from './components/common/Toast.vue'

const currentView = ref('tasks')
const isDark = ref(false)
const searchKeyword = ref('')
const pomodoroTarget = ref(null)

function toggleTheme() {
  isDark.value = !isDark.value
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

// 同步 dark 类到 <html>，使 Teleport 到 body 的组件也能继承主题
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

onMounted(() => {
  const saved = localStorage.getItem('theme')
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    isDark.value = true
  }
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
