<template>
  <header class="app-header">
    <div class="header-left">
      <div class="logo">
        <span class="logo-icon">🍅</span>
        <span class="logo-text">Tomato</span>
      </div>
    </div>
    <div class="header-center">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索任务... (Ctrl+K)"
          @keyup.enter="$emit('search', keyword)"
          @keyup.escape="keyword = ''; $emit('search', '')"
        />
        <button v-if="keyword" class="search-clear" @click="keyword = ''; $emit('search', '')">✕</button>
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
defineEmits(['toggleTheme', 'search'])

const keyword = ref('')
const isElectron = ref(false)
const isMax = ref(false)

function winMinimize() { window.electronAPI?.minimize() }
function winMaximize() { window.electronAPI?.maximize() }
function winClose()    { window.electronAPI?.close() }

function onKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    document.querySelector('.search-input')?.focus()
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  isElectron.value = !!window.electronAPI?.isElectron
  if (isElectron.value) {
    window.electronAPI.isMaximized().then(v => isMax.value = v)
    window.electronAPI.onMaximizedChanged(v => isMax.value = v)
  }
})
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
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
/* 按钮和输入框区域不可拖拽 */
.app-header button,
.app-header input,
.header-center {
  -webkit-app-region: no-drag;
}

.header-left { flex-shrink: 0; }
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
.header-center { flex: 1; display: flex; justify-content: center; }
.search-box {
  position: relative;
  width: 100%;
  max-width: 400px;
}
.search-icon {
  position: absolute; left: 12px; top: 50%;
  transform: translateY(-50%);
  font-size: 13px;
  opacity: 0.5;
  pointer-events: none;
}
.search-input {
  width: 100%;
  height: 34px;
  padding: 0 32px 0 36px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-full);
  background: var(--c-bg);
  color: var(--c-text);
  font-size: var(--fs-sm);
  font-family: var(--f-body);
  outline: none;
  transition: all var(--t-fast) var(--ease-smooth);
}
.search-input:focus {
  border-color: var(--c-primary);
  box-shadow: 0 0 0 3px var(--c-primary-soft);
  background: var(--c-surface);
}
.search-input::placeholder { color: var(--c-text-3); }
.search-clear {
  position: absolute; right: 8px; top: 50%;
  transform: translateY(-50%);
  background: none; border: none;
  color: var(--c-text-3); cursor: pointer;
  font-size: 12px; padding: 4px;
  border-radius: 50%;
  transition: color var(--t-fast);
}
.search-clear:hover { color: var(--c-text); }
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
