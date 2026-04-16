<template>
  <header class="app-header">
    <div class="header-left">
      <div class="logo">
        <span class="logo-icon">🍅</span>
        <span class="logo-text">Tomato</span>
      </div>
    </div>
    <div class="header-right">
      <button class="btn-icon btn-ghost" :title="isDark ? '切换浅色' : '切换深色'" @click="$emit('toggleTheme')">
        {{ isDark ? '☀️' : '🌙' }}
      </button>
    </div>
    <!-- Electron 窗口控制按钮 -->
    <div v-if="isElectron" class="window-controls">
      <button class="wc-btn" title="最小化" @click="winMinimize">
        <svg width="12" height="12" viewBox="0 0 12 12"><line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" stroke-width="1.2"/></svg>
      </button>
      <button class="wc-btn" :title="isMax ? '还原' : '最大化'" @click="winMaximize">
        <svg v-if="!isMax" width="12" height="12" viewBox="0 0 12 12"><rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>
        <svg v-else width="12" height="12" viewBox="0 0 12 12">
          <rect x="3.5" y="1" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1.1"/>
          <rect x="1.5" y="3.5" width="7" height="7" fill="var(--c-surface)" stroke="currentColor" stroke-width="1.1"/>
        </svg>
      </button>
      <button class="wc-btn wc-close" title="关闭（最小化到托盘）" @click="winClose">
        <svg width="12" height="12" viewBox="0 0 12 12"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="1.2"/><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="1.2"/></svg>
      </button>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

defineProps({ isDark: Boolean })
defineEmits(['toggleTheme'])

const isElectron = ref(false)
const isMax = ref(false)

function winMinimize() { window.electronAPI?.minimize() }
function winMaximize() { window.electronAPI?.maximize() }
function winClose()    { window.electronAPI?.close() }

let removeMaxListener = null

onMounted(() => {
  isElectron.value = !!window.electronAPI?.isElectron
  if (isElectron.value) {
    window.electronAPI.isMaximized().then(v => isMax.value = v)
    removeMaxListener = window.electronAPI.onMaximizedChanged(v => isMax.value = v)
  }
})
onUnmounted(() => {
  if (removeMaxListener) removeMaxListener()
})
</script>

<style scoped>
.app-header {
  height: var(--header-h);
  display: flex; align-items: center;
  padding: 0 var(--sp-4) 0 var(--sp-5);
  border-bottom: 1px solid var(--c-border);
  background: var(--c-surface);
  flex-shrink: 0;
  z-index: 100;
  gap: var(--sp-4);
  /* Electron 无边框窗口：标题栏可拖拽 */
  -webkit-app-region: drag;
  user-select: none;
}
/* 按钮区域不可拖拽 */
.app-header button {
  -webkit-app-region: no-drag;
}

.header-left { flex-shrink: 0; flex: 1; }
.logo {
  display: flex; align-items: center; gap: var(--sp-2);
}
.logo-icon { font-size: 22px; }
.logo-text {
  font-family: var(--f-display);
  font-size: var(--fs-xl);
  font-weight: var(--fw-bold);
  color: var(--c-text);
  letter-spacing: -0.02em;
}
.header-right { flex-shrink: 0; }

/* 窗口控制按钮 */
.window-controls {
  display: flex;
  align-items: center;
  margin-left: var(--sp-2);
  -webkit-app-region: no-drag;
}
.wc-btn {
  width: 38px;
  height: 34px;
  display: flex; align-items: center; justify-content: center;
  border: none;
  background: transparent;
  color: var(--c-text-2);
  cursor: pointer;
  transition: background var(--t-fast), color var(--t-fast);
}
.wc-btn:hover {
  background: var(--c-border);
  color: var(--c-text);
}
.wc-close:hover {
  background: #E81123;
  color: #fff;
}
</style>
