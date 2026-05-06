<template>
  <div class="view workbench-view">
    <div class="view-toolbar">
      <h2 class="view-title">工作台</h2>
      <button class="btn btn-primary" @click="showAddDialog = true">＋ 添加任务</button>
    </div>

    <div v-if="loading" class="loading-state">加载中...</div>
    <template v-else>
      <div v-if="workbenchTasks.length === 0" class="empty-state">
        <div class="icon">🖥️</div>
        <div class="title">工作台为空</div>
        <div class="desc">在任务页分解步骤后，点击「添加任务」将任务加入工作台并行处理</div>
      </div>

      <div v-else class="swimlanes" :style="{ '--lane-count': workbenchTasks.length }">
        <div
          v-for="task in workbenchTasks"
          :key="task.id"
          class="lane card card-elevated"
        >
          <!-- 任务头部 -->
          <div class="lane-header">
            <div class="lane-title-row">
              <span class="lane-priority" :class="'priority-' + task.priority">{{ task.priority }}</span>
              <span class="lane-title">{{ task.title }}</span>
              <button class="btn btn-sm btn-ghost" @click="removeFromWorkbench(task)" title="移出工作台">✕</button>
            </div>
            <div v-if="task.background" class="lane-background">
              <span class="lane-bg-label">🛠 {{ task.background }}</span>
            </div>
            <div v-else-if="task.description" class="lane-background lane-bg-desc">
              {{ task.description }}
            </div>
          </div>

          <!-- 步骤流程图 -->
          <div class="lane-flow">
            <div v-if="task.steps?.length === 0" class="lane-no-steps">
              暂无步骤，请在任务页分解
            </div>
            <template v-else>
              <div
                v-for="(step, si) in task.steps"
                :key="step.id"
                class="flow-node-wrap"
              >
                <div v-if="si > 0" class="flow-connector" :class="{ done: task.steps[si-1]?.status === 'done' }"></div>

                <div
                  class="flow-node"
                  :class="[
                    'node-' + step.type,
                    { 'node-done': step.status === 'done', 'node-active': isActiveStep(task, si) }
                  ]"
                  draggable="true"
                  @dragstart="onFlowDragStart(task, si, $event)"
                  @dragover.prevent="onFlowDragOver(task, si)"
                  @dragleave="onFlowDragLeave(task)"
                  @drop.prevent="onFlowDrop(task, si)"
                  @dragend="onFlowDragEnd(task)"
                  @click="toggleStep(task, step, si)"
                >
                  <span class="node-drag-handle" title="拖拽排序">⠿</span>
                  <span class="node-icon">{{ stepIcon(step) }}</span>
                  <span class="node-title">{{ step.title }}</span>
                  <span class="node-type" :class="'badge-' + stepTypeColor(step.type)">{{ stepTypeLabel(step.type) }}</span>
                  <button class="node-done-btn" v-if="step.status !== 'done'" @click.stop="markStepDone(task, step)" title="标记完成">✓</button>
                </div>
              </div>
            </template>
          </div>

          <!-- 快捷操作 -->
          <div class="lane-actions">
            <div class="lane-quick-add">
              <input
                v-model="task._newStepTitle"
                class="input input-sm"
                placeholder="快速添加步骤..."
                @keyup.enter="quickAddStep(task)"
              />
              <select v-model="task._newStepType" class="select select-sm" style="width:auto;min-width:70px">
                <option value="step">步骤</option>
                <option value="start">开始</option>
                <option value="branch">分支</option>
                <option value="end">结束</option>
              </select>
              <button class="btn btn-sm btn-primary" @click="quickAddStep(task)">＋</button>
            </div>
            <button class="btn btn-sm" @click="markTaskDone(task)" v-if="task.status !== 'done'">✓ 标记完成</button>
            <span v-else class="lane-done-label">✅ 已完成</span>
          </div>
        </div>
      </div>
    </template>

    <Modal v-model="showAddDialog" title="添加任务到工作台" width="480px">
      <div class="form-group">
        <label class="form-label">选择任务</label>
        <select v-model="addTaskId" class="select">
          <option value="">-- 请选择 --</option>
          <option v-for="t in availableTasks" :key="t.id" :value="t.id">
            {{ t.priority }} | {{ t.title }}
          </option>
        </select>
      </div>
      <template #footer>
        <button class="btn" @click="showAddDialog = false">取消</button>
        <button class="btn btn-primary" @click="addToWorkbench" :disabled="!addTaskId">添加</button>
      </template>
    </Modal>

    <ConfirmDialog ref="confirmDialog" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'
import Modal from '@/components/common/Modal.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

const { get, post, put } = useApi()
const toast = useToast()
const confirmDialog = ref(null)
const loading = ref(true)

const workbenchTasks = ref([])
const allTasks = ref([])
const showAddDialog = ref(false)
const addTaskId = ref('')
const availableTasks = ref([])

// 拖拽状态（按 taskId 存储）
const flowDrag = ref({})

const stepTypeLabels = { start: '开始', step: '步骤', branch: '分支', end: '结束' }
function stepTypeLabel(type) { return stepTypeLabels[type] || '步骤' }
function stepTypeColor(type) {
  return { start: 'green', step: 'blue', branch: 'orange', end: 'primary' }[type] || 'blue'
}
function stepIcon(step) {
  return { start: '▶', step: '●', branch: '◇', end: '■' }[step.type] || '●'
}

function isActiveStep(task, idx) {
  const steps = task.steps || []
  if (steps.length === 0) return false
  const firstUndone = steps.findIndex(s => s.status !== 'done')
  if (firstUndone === -1) return false
  return idx === firstUndone
}

async function load() {
  loading.value = true
  try {
    const tasks = await get('/tasks')
    allTasks.value = tasks
    const wbTasks = tasks.filter(t => t.inWorkbench)
    const withSteps = await Promise.all(wbTasks.map(async (t) => {
      try {
        const steps = await get('/steps?taskId=' + t.id)
        return { ...t, steps, _newStepTitle: '', _newStepType: 'step' }
      } catch {
        return { ...t, steps: [], _newStepTitle: '', _newStepType: 'step' }
      }
    }))
    workbenchTasks.value = withSteps
    availableTasks.value = tasks.filter(t => t.status !== 'done' && !t.inWorkbench)
  } catch (e) {
    toast.error('加载失败')
  } finally {
    loading.value = false
  }
}

async function addToWorkbench() {
  if (!addTaskId.value) return
  try {
    await put('/tasks/' + addTaskId.value, { inWorkbench: true })
    showAddDialog.value = false
    addTaskId.value = ''
    await load()
    toast.success('已添加到工作台')
  } catch (e) {
    toast.error(e.message)
  }
}

async function removeFromWorkbench(task) {
  if (!await confirmDialog.value?.show(`将「${task.title}」移出工作台？`)) return
  try {
    await put('/tasks/' + task.id, { inWorkbench: false })
    await load()
    toast.success('已移出工作台')
  } catch (e) {
    toast.error(e.message)
  }
}

async function toggleStep(task, step, idx) {
  if (step.status === 'done') return
  await markStepDone(task, step)
}

async function markStepDone(task, step) {
  try {
    await put('/steps/' + step.id, { status: 'done' })
    const wbTask = workbenchTasks.value.find(t => t.id === task.id)
    if (wbTask) {
      wbTask.steps = await get('/steps?taskId=' + task.id)
    }
  } catch (e) {
    toast.error(e.message)
  }
}

async function quickAddStep(task) {
  const title = (task._newStepTitle || '').trim()
  if (!title) return
  try {
    await post('/steps', { taskId: task.id, title, type: task._newStepType || 'step' })
    task._newStepTitle = ''
    const wbTask = workbenchTasks.value.find(t => t.id === task.id)
    if (wbTask) {
      wbTask.steps = await get('/steps?taskId=' + task.id)
    }
  } catch (e) {
    toast.error(e.message)
  }
}

async function markTaskDone(task) {
  if (!await confirmDialog.value?.show(`确定将「${task.title}」标记为已完成？`)) return
  try {
    await put('/tasks/' + task.id, { status: 'done', inWorkbench: false })
    await load()
    toast.success('任务已完成')
  } catch (e) {
    toast.error(e.message)
  }
}

// --- 工作台内拖拽排序 ---
function onFlowDragStart(task, idx, e) {
  flowDrag.value = { taskId: task.id, from: idx }
  e.dataTransfer.effectAllowed = 'move'
}
function onFlowDragOver(task, idx) {
  if (flowDrag.value.taskId === task.id) {
    flowDrag.value.over = idx
  }
}
function onFlowDragLeave(task) {
  if (flowDrag.value.taskId === task.id) {
    flowDrag.value.over = -1
  }
}
async function onFlowDrop(task, targetIdx) {
  const { taskId, from } = flowDrag.value
  flowDrag.value = {}
  if (taskId !== task.id || from === targetIdx) return
  const wbTask = workbenchTasks.value.find(t => t.id === task.id)
  if (!wbTask) return
  const list = [...wbTask.steps]
  const [moved] = list.splice(from, 1)
  list.splice(targetIdx, 0, moved)
  const reordered = list.map((s, i) => ({ ...s, order: i }))
  wbTask.steps = reordered
  try {
    await put('/steps/reorder/batch', { items: reordered.map(s => ({ id: s.id, order: s.order })) })
  } catch (e) {
    toast.error('排序保存失败')
  }
}
function onFlowDragEnd(task) {
  flowDrag.value = {}
}

onMounted(load)
</script>

<style scoped>
.view { flex: 1; overflow: auto; padding: var(--sp-5); animation: fadeIn 0.3s var(--ease-smooth); }
.view-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: var(--sp-5); flex-wrap: wrap; gap: var(--sp-3);
}
.view-title {
  font-family: var(--f-display); font-size: var(--fs-2xl);
  font-weight: var(--fw-bold); color: var(--c-text);
}

/* --- Swimlanes --- */
.swimlanes {
  display: grid;
  grid-template-columns: repeat(var(--lane-count, 1), minmax(280px, 1fr));
  gap: var(--sp-4);
  align-items: start;
}

/* --- Lane (整个任务列是一个卡片) --- */
.lane {
  padding: 0;
  overflow: hidden;
  display: flex; flex-direction: column;
}

.lane-header {
  padding: var(--sp-3) var(--sp-4);
  border-bottom: 1px solid var(--c-border);
}
.lane-title-row {
  display: flex; align-items: center; gap: var(--sp-2);
}
.lane-priority {
  font-family: var(--f-mono); font-size: 11px;
  padding: 1px 6px; border-radius: var(--radius-full);
  flex-shrink: 0;
}
.lane-title {
  flex: 1;
  font-weight: var(--fw-semibold);
  font-size: var(--fs-md);
  color: var(--c-text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.lane-background {
  margin-top: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  background: var(--c-blue-soft);
  border-radius: var(--radius-sm);
  font-size: var(--fs-xs);
  color: var(--c-blue);
  line-height: var(--lh-relaxed);
  word-break: break-all;
}
.lane-bg-desc {
  background: var(--c-bg);
  color: var(--c-text-2);
}

/* --- Flow --- */
.lane-flow {
  display: flex; flex-direction: column;
  padding: var(--sp-3) var(--sp-4);
  flex: 1;
}
.lane-no-steps {
  text-align: center; padding: var(--sp-6) 0;
  color: var(--c-text-3); font-size: var(--fs-sm);
}

.flow-connector {
  width: 2px; height: 18px;
  background: var(--c-border-2);
  margin-left: 18px;
  transition: background var(--t-fast);
}
.flow-connector.done { background: var(--c-green); }

/* Node */
.flow-node {
  display: flex; align-items: center; gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-2);
  border-radius: var(--radius-md);
  border: 1.5px solid var(--c-border);
  background: var(--c-surface);
  cursor: pointer;
  transition: all var(--t-fast) var(--ease-smooth);
  position: relative;
}
.flow-node:hover {
  border-color: var(--c-primary);
}

.flow-node.node-start { border-left: 3px solid var(--c-green); }
.flow-node.node-end   { border-left: 3px solid var(--c-primary); }
.flow-node.node-branch{ border-left: 3px solid var(--c-orange); }
.flow-node.node-step  { border-left: 3px solid var(--c-blue); }

/* 已完成步骤 — 暗色主题下也能看清 */
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

.node-drag-handle {
  color: var(--c-text-3); font-size: 15px;
  cursor: grab; line-height: 1; flex-shrink: 0; user-select: none;
}
.node-drag-handle:active { cursor: grabbing; }
.node-icon {
  font-size: 13px; width: 18px; text-align: center;
  flex-shrink: 0; color: var(--c-text-2);
}
.node-title { flex: 1; font-size: var(--fs-sm); font-weight: var(--fw-medium); }
.node-type {
  font-size: var(--fs-xs); padding: 1px 5px;
  border-radius: var(--radius-full); flex-shrink: 0;
}
.node-done-btn {
  width: 22px; height: 22px;
  border: 2px solid var(--c-green);
  border-radius: 50%;
  background: transparent;
  color: var(--c-green);
  font-size: 12px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  opacity: 0;
  transition: all var(--t-fast);
  flex-shrink: 0;
}
.flow-node:hover .node-done-btn { opacity: 1; }
.node-done-btn:hover { background: var(--c-green); color: #fff; }

/* Lane actions */
.lane-actions {
  display: flex; flex-direction: column; gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  border-top: 1px solid var(--c-border);
  background: var(--c-bg);
}
.lane-quick-add { display: flex; gap: var(--sp-1); }
.input-sm { height: 30px; font-size: var(--fs-sm); padding: 0 var(--sp-2); flex: 1; }
.lane-done-label {
  text-align: center; font-size: var(--fs-sm);
  color: var(--c-green); font-weight: var(--fw-medium);
}
</style>
