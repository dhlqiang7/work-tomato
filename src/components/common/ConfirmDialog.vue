<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="confirm-overlay" @click.self="cancel">
        <div class="confirm-content">
          <div class="confirm-msg">{{ message }}</div>
          <div class="confirm-actions">
            <button class="btn" @click="cancel">取消</button>
            <button class="btn btn-primary" @click="confirm">确定</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

const visible = ref(false)
const message = ref('')
let resolveFn = null

function show(msg) {
  return new Promise((resolve) => {
    message.value = msg
    visible.value = true
    resolveFn = resolve
  })
}

function confirm() {
  visible.value = false
  resolveFn?.(true)
}

function cancel() {
  visible.value = false
  resolveFn?.(false)
}

defineExpose({ show })
</script>

<style scoped>
.confirm-overlay {
  position: fixed; inset: 0;
  background: var(--c-overlay);
  display: flex; align-items: center; justify-content: center;
  z-index: 9200;
  backdrop-filter: blur(4px);
}
.confirm-content {
  background: var(--c-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 24px;
  min-width: 320px;
  max-width: 420px;
  animation: scaleIn 0.2s var(--ease-spring);
}
.confirm-msg {
  font-size: var(--fs-md);
  color: var(--c-text);
  line-height: var(--lh-relaxed);
  margin-bottom: 20px;
}
.confirm-actions {
  display: flex; justify-content: flex-end; gap: 8px;
}
.confirm-enter-active { transition: opacity 0.2s var(--ease-smooth); }
.confirm-leave-active { transition: opacity 0.15s var(--ease-smooth); }
.confirm-enter-from, .confirm-leave-to { opacity: 0; }
</style>
