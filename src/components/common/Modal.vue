<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="$emit('update:modelValue', false)">
        <div class="modal-content" :style="{ maxWidth: width }">
          <div v-if="title" class="modal-header">
            <h3 class="modal-title">{{ title }}</h3>
            <button class="btn-icon btn-ghost modal-close" @click="$emit('update:modelValue', false)">✕</button>
          </div>
          <div class="modal-body">
            <slot />
          </div>
          <div v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
defineProps({
  modelValue: Boolean,
  title: { type: String, default: '' },
  width: { type: String, default: '520px' }
})
defineEmits(['update:modelValue'])
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0;
  background: var(--c-overlay);
  display: flex; align-items: center; justify-content: center;
  z-index: 9000;
  padding: 24px;
  backdrop-filter: blur(4px);
}
.modal-content {
  background: var(--c-card);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-height: 85vh;
  display: flex; flex-direction: column;
  animation: scaleIn 0.25s var(--ease-spring);
  overflow: hidden;
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px 0;
}
.modal-title {
  font-family: var(--f-display);
  font-size: var(--fs-xl);
  font-weight: var(--fw-semibold);
  color: var(--c-text);
}
.modal-close {
  width: 32px; height: 32px;
  font-size: 14px;
  border: none;
  color: var(--c-text-2);
}
.modal-body {
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
}
.modal-footer {
  padding: 16px 24px;
  display: flex; justify-content: flex-end; gap: 8px;
  border-top: 1px solid var(--c-border);
}
/* Transitions */
.modal-enter-active { transition: opacity 0.2s var(--ease-smooth); }
.modal-leave-active { transition: opacity 0.15s var(--ease-smooth); }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal-content { transform: scale(0.95); }
</style>
