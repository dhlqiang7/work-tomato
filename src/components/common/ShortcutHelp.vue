<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="shortcut-overlay" @click.self="$emit('update:modelValue', false)">
        <div class="shortcut-content">
          <div class="sc-header">
            <h3 class="sc-title">键盘快捷键</h3>
            <button class="btn-icon btn-ghost sc-close" @click="$emit('update:modelValue', false)">✕</button>
          </div>
          <div class="sc-body">
            <div v-for="group in groups" :key="group.title" class="sc-group">
              <div class="sc-group-title">{{ group.title }}</div>
              <div v-for="item in group.items" :key="item.key" class="sc-row">
                <kbd>{{ item.key }}</kbd>
                <span>{{ item.desc }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
defineProps({ modelValue: Boolean })
defineEmits(['update:modelValue'])

const groups = [
  { title: '导航', items: [
    { key: '1', desc: '任务' },
    { key: '2', desc: '项目' },
    { key: '3', desc: '专注' },
    { key: '4', desc: '统计' },
    { key: '5', desc: '回顾' },
  ]},
  { title: '任务', items: [
    { key: 'N', desc: '新建任务' },
    { key: 'S', desc: '开始番茄钟（当前任务）' },
    { key: 'P', desc: '暂停 / 继续番茄钟' },
  ]},
  { title: '通用', items: [
    { key: 'Ctrl + K', desc: '搜索任务' },
    { key: 'Esc', desc: '关闭弹窗' },
    { key: '?', desc: '显示快捷键帮助' },
  ]}
]
</script>

<style scoped>
.shortcut-overlay {
  position: fixed; inset: 0;
  background: var(--c-overlay);
  display: flex; align-items: center; justify-content: center;
  z-index: 9100;
  backdrop-filter: blur(4px);
}
.shortcut-content {
  background: var(--c-card);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  width: 380px;
  max-height: 80vh;
  overflow: hidden;
  animation: scaleIn 0.2s var(--ease-spring);
}
.sc-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px 0;
}
.sc-title {
  font-family: var(--f-display);
  font-size: var(--fs-xl);
  font-weight: var(--fw-semibold);
  color: var(--c-text);
}
.sc-close { width: 32px; height: 32px; font-size: 14px; border: none; color: var(--c-text-2); }
.sc-body { padding: 16px 24px 24px; overflow-y: auto; }
.sc-group + .sc-group { margin-top: 16px; }
.sc-group-title {
  font-size: var(--fs-xs);
  font-weight: var(--fw-semibold);
  color: var(--c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}
.sc-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 5px 0;
}
.sc-row span { font-size: var(--fs-sm); color: var(--c-text-2); }
kbd {
  display: inline-block;
  padding: 2px 8px;
  border: 1px solid var(--c-border);
  border-radius: 4px;
  font-family: var(--f-mono);
  font-size: 12px;
  background: var(--c-bg);
  color: var(--c-text);
  min-width: 28px;
  text-align: center;
}
.shortcut-enter-active { transition: opacity 0.2s var(--ease-smooth); }
.shortcut-leave-active { transition: opacity 0.15s var(--ease-smooth); }
.shortcut-enter-from, .shortcut-leave-to { opacity: 0; }
</style>
