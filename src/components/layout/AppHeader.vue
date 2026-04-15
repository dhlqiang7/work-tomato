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
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

defineProps({ isDark: Boolean })
defineEmits(['toggleTheme', 'search'])

const keyword = ref('')

function onKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    document.querySelector('.search-input')?.focus()
  }
}
onMounted(() => document.addEventListener('keydown', onKeydown))
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
}
.header-left { flex-shrink: 0; }
.logo {
  display: flex; align-items: center; gap: var(--sp-2);
  user-select: none;
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
</style>
