<template>
  <Teleport to="body">
    <div v-if="visible" class="context-menu" :style="{ left: x + 'px', top: y + 'px' }">
      <div v-for="item in items" :key="item.label" class="cm-item" :class="{ 'cm-danger': item.danger }" @click="onClick(item)">
        <span class="cm-icon">{{ item.icon || '' }}</span>
        <span class="cm-label">{{ item.label }}</span>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const visible = ref(false)
const x = ref(0)
const y = ref(0)
const items = ref([])
let callback = null

function show(menuItems, event) {
  items.value = menuItems
  // 避免菜单溢出屏幕
  const mx = event.clientX
  const my = event.clientY
  x.value = Math.min(mx, window.innerWidth - 180)
  y.value = Math.min(my, window.innerHeight - items.value.length * 36 - 8)
  visible.value = true
  return new Promise((resolve) => { callback = resolve })
}

function onClick(item) {
  visible.value = false
  callback?.(item.action)
  callback = null
}

function onDocClick() {
  visible.value = false
  callback?.(null)
  callback = null
}

onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))

defineExpose({ show })
</script>

<style scoped>
.context-menu {
  position: fixed;
  background: var(--c-elevated);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--sp-1);
  z-index: 9500;
  min-width: 140px;
  animation: scaleIn 0.12s var(--ease-smooth);
}
.cm-item {
  display: flex; align-items: center; gap: var(--sp-2);
  padding: var(--sp-1) var(--sp-3);
  border-radius: var(--radius-sm);
  font-size: var(--fs-sm);
  color: var(--c-text);
  cursor: pointer;
  transition: background var(--t-fast);
  white-space: nowrap;
}
.cm-item:hover { background: var(--c-bg); }
.cm-danger { color: var(--c-primary); }
.cm-danger:hover { background: var(--c-primary-soft); }
.cm-icon { width: 18px; text-align: center; flex-shrink: 0; }
.cm-label { flex: 1; }
</style>
