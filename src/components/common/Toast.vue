<template>
  <div class="toast-container">
    <TransitionGroup name="toast">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="[`toast-${t.type}`, { leaving: t.leaving }]">
        <span class="toast-icon">{{ iconMap[t.type] }}</span>
        <span class="toast-msg">{{ t.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { useToast } from '@/composables/useToast'
const { toasts } = useToast()
const iconMap = { info: '💡', success: '✅', error: '❌', warning: '⚠️' }
</script>

<style scoped>
.toast-container {
  position: fixed; top: 16px; right: 16px;
  z-index: 10000;
  display: flex; flex-direction: column; gap: 8px;
  pointer-events: none;
}
.toast {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px;
  background: var(--c-elevated);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  font-size: var(--fs-sm);
  color: var(--c-text);
  pointer-events: auto;
  animation: toastIn 0.3s var(--ease-spring);
  max-width: 360px;
}
.toast.leaving { animation: toastOut 0.25s var(--ease-smooth) forwards; }
.toast-success { border-left: 3px solid var(--c-green); }
.toast-error   { border-left: 3px solid var(--c-primary); }
.toast-warning { border-left: 3px solid var(--c-orange); }
.toast-icon { font-size: 15px; flex-shrink: 0; }
.toast-msg { line-height: 1.4; }
</style>
