<template>
  <div
    class="flow-node"
    :class="[
      'node-' + step.type,
      { 'node-done': done, 'node-active': active, 'branch-node': inBranch }
    ]"
    :draggable="isDraggable"
    @dragstart="onDS"
    @dragover.prevent="emit('dragOverNode', task, stepIdx)"
    @dragleave="emit('dragLeaveNode', task)"
    @drop.prevent="emit('dropNode', task, stepIdx)"
    @dragend="emit('dragEnd', task)"
  >
    <div class="node-controls">
      <span v-if="isDraggable" class="node-drag-handle" title="拖拽排序">⠿</span>
      <span v-else class="node-drag-handle node-locked" title="固定位置">🔒</span>
      <span class="node-icon">{{ icon }}</span>
      <span class="node-type" :class="'badge-' + typeColor">{{ typeLabel }}</span>
      <div class="node-spacer"></div>
      <div class="node-hover-actions">
        <button class="btn btn-sm btn-ghost node-action-btn" @click.stop="emit('edit', step)" title="编辑">✏️</button>
        <button class="btn btn-sm btn-ghost node-action-btn" @click.stop="emit('delete', task, step)" title="删除">🗑️</button>
      </div>
      <button
        class="node-status-btn"
        :class="step.status === 'done' ? 'is-done' : 'is-undone'"
        @click.stop="emit(step.status === 'done' ? 'markUndone' : 'markDone', task, step)"
        :title="step.status === 'done' ? '回退未完成' : '标记完成'"
      >{{ step.status === 'done' ? '✓' : '···' }}</button>
    </div>
    <div class="node-title-row">
      <input
        v-if="step._editing"
        v-model="step._editTitle"
        class="node-edit-input"
        @click.stop
        @keyup.enter="emit('saveTitle', task, step)"
        @keyup.escape="step._editing = false"
        @blur="emit('saveTitle', task, step)"
      />
      <span v-else class="node-title" @dblclick.stop="emit('edit', step)">{{ step.title }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  step: Object,
  task: Object,
  stepIdx: Number,
  inBranch: { type: Boolean, default: false },
  done: { type: Boolean, default: false },
  active: { type: Boolean, default: false }
})

const emit = defineEmits([
  'markDone', 'markUndone', 'edit', 'saveTitle', 'delete',
  'dragStart', 'dragOverNode', 'dragLeaveNode', 'dropNode', 'dragEnd'
])

const stepTypeLabels = { start: '开始', step: '步骤', branch: '分支', end: '结束' }
const typeLabel = computed(() => stepTypeLabels[props.step.type] || '步骤')
const typeColor = computed(() => {
  return { start: 'green', step: 'blue', branch: 'orange', end: 'primary' }[props.step.type] || 'blue'
})
const icon = computed(() => {
  return { start: '▶', step: '●', branch: '◇', end: '■' }[props.step.type] || '●'
})
const isDraggable = computed(() => props.step.type !== 'start' && props.step.type !== 'end')

function onDS(e) {
  if (!isDraggable.value) { e.preventDefault(); return }
  e.dataTransfer.effectAllowed = 'move'
  emit('dragStart', props.task, props.stepIdx, e)
}
</script>

<style scoped>
.flow-node {
  display: flex; flex-direction: column;
  padding: var(--sp-2) var(--sp-2);
  border-radius: var(--radius-md);
  border: 1.5px solid var(--c-border);
  background: var(--c-surface);
  cursor: default;
  transition: all var(--t-fast) var(--ease-smooth);
  position: relative;
  gap: var(--sp-1);
}
.flow-node:hover { border-color: var(--c-primary); }
.flow-node[draggable="true"] { cursor: grab; }
.flow-node[draggable="true"]:active { cursor: grabbing; }

.flow-node.node-start { border-left: 3px solid var(--c-green); }
.flow-node.node-end   { border-left: 3px solid var(--c-primary); }
.flow-node.node-branch{ border-left: 3px solid var(--c-orange); }
.flow-node.node-step  { border-left: 3px solid var(--c-blue); }

.branch-node { flex: 1; min-width: 0; }

.flow-node.node-done {
  opacity: 0.7;
  background: var(--c-green-soft);
  border-color: var(--c-green);
}
.flow-node.node-done .node-icon { color: var(--c-green); }
.flow-node.node-done .node-title {
  text-decoration: line-through;
  color: var(--c-text-3);
}

.flow-node.node-active {
  border-color: var(--c-primary);
  box-shadow: 0 0 0 2px var(--c-primary-soft);
  animation: pulse 2s ease-in-out infinite;
}

.node-controls {
  display: flex; align-items: center; gap: var(--sp-1);
}
.node-spacer { flex: 1; }

.node-drag-handle {
  color: var(--c-text-3); font-size: 15px;
  cursor: grab; line-height: 1; flex-shrink: 0; user-select: none;
}
.node-drag-handle:active { cursor: grabbing; }
.node-drag-handle.node-locked { cursor: default; font-size: 11px; }

.node-icon {
  font-size: 13px; width: 18px; text-align: center;
  flex-shrink: 0; color: var(--c-text-2);
}
.node-type {
  font-size: var(--fs-xs); padding: 1px 5px;
  border-radius: var(--radius-full); flex-shrink: 0;
}

.node-status-btn {
  width: 22px; height: 22px;
  border-radius: 50%;
  border: 2px solid var(--c-text-3);
  background: transparent;
  color: var(--c-text-3);
  font-size: 12px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all var(--t-fast);
  flex-shrink: 0;
}
.node-status-btn:hover { border-color: var(--c-green); color: var(--c-green); }
.node-status-btn.is-done {
  border-color: var(--c-green); color: var(--c-green);
  background: var(--c-green-soft);
}
.node-status-btn.is-done:hover {
  background: var(--c-green); color: #fff;
}

.node-hover-actions {
  display: flex; gap: 1px;
  opacity: 0;
  transition: opacity var(--t-fast);
}
.flow-node:hover .node-hover-actions { opacity: 1; }
.node-action-btn { width: 24px; height: 24px; padding: 0; font-size: 12px; }

.node-title-row { padding-left: 20px; }
.node-title {
  font-size: var(--fs-sm); font-weight: var(--fw-medium);
  line-height: var(--lh-relaxed);
  word-break: break-word;
}
.node-edit-input {
  width: 100%;
  border: 1px solid var(--c-primary);
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  color: var(--c-text);
  font-size: var(--fs-sm);
  padding: 0 var(--sp-1);
  height: 24px;
  outline: none;
  font-family: var(--f-body);
}
</style>
