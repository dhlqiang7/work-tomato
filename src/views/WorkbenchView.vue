<template>
  <div class="view workbench-view">
    <div class="view-toolbar">
      <h2 class="view-title">工作台</h2>
      <button class="btn btn-primary" @click="showAddDialog = true">＋ 添加任务</button>
    </div>

    <div v-if="loading" class="loading-state">加载中...</div>
    <template v-else>
      <!-- 空状态 -->
      <div v-if="workbenchTasks.length === 0" class="empty-state">
        <div class="icon">🖥️</div>
        <div class="title">工作台为空</div>
        <div class="desc">在任务页分解步骤后，点击「添加任务」将任务加入工作台并行处理</div>
      </div>

      <!-- 泳道区域 -->
      <div v-else class="swimlanes" :style="{ '--lane-count': workbenchTasks.length }">
        <div v-for="task in workbenchTasks" :key="task.id" class="lane">
          <!-- 任务背景卡片 -->
          <div class="lane-header card">
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
              <div v-for="(step, si) in task.steps" :key="step.id" class="flow-node-wrap">
                <!-- 连接线 -->
                <div v-if="si > 0" class="flow-connector" :class="{ done: task.steps[si-1]?.status === 'done' }"></div>

                <!-- 步骤节点 -->
                <div
                  class="flow-node"
                  :class="[
                    'node-' + step.type,
                    { 'node-done': step.status === 'done', 'node-active': isActiveStep(task, si) }
                  ]"
                  @click="toggleStep(task, step, si)"
                >
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
                style="flex:1"
              />
              <button class="btn btn-sm btn-primary" @click="quickAddStep(task)">＋</button>
            </div>
            <button class="btn btn-sm" @click="markTaskDone(task)" v-if="task.status !== 'done'">✓ 标记完成</button>
            <span v-else class="lane-done-label">✅ 已完成</span>
          </div>
        </div>
      </div>
    </template>

    <!-- 添加任务对话框 -->
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

const { get, post, put, del } = useApi()
const toast = useToast()
const confirmDialog = ref(null)
const loading = ref(true)

const workbenchTasks = ref([])
const allTasks = ref([])
const showAddDialog = ref(false)
const addTaskId = ref('')

const availableTasks = ref([])

const stepTypeLabels = { start: '开始', step: '步骤', branch: '分支', end: '结束' }
function stepTypeLabel(type) { return stepTypeLabels[type] || '步骤' }
function stepTypeColor(type) {
  return { start: 'green', step: 'blue', branch: 'orange', end: 'primary' }[type] || 'blue'
}
function stepIcon(step) {
  return { start: '▶', step: '●', branch: '◇', end: '■' }[step.type] || '●'
}

function isActiveStep(task, idx) {
  // 第一个未完成的步骤为当前步骤
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

    // 加载工作台任务
    const wbTasks = tasks.filter(t => t.inWorkbench)
    // 并行加载每个工作台任务的步骤
    const withSteps = await Promise.all(wbTasks.map(async (t) => {
      try {
        const steps = await get('/steps?taskId=' + t.id)
        return { ...t, steps, _newStepTitle: '' }
      } catch {
        return { ...t, steps: [], _newStepTitle: '' }
      }
    }))
    workbenchTasks.value = withSteps

    // 可用于添加的任务（非已完成、未在工作台）
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
    // 刷新该任务的步骤
    const steps = await get('/steps?taskId=' + task.id)
    const wbTask = workbenchTasks.value.find(t => t.id === task.id)
    if (wbTask) wbTask.steps = steps
  } catch (e) {
    toast.error(e.message)
  }
}

async function quickAddStep(task) {
  const title = (task._newStepTitle || '').trim()
  if (!title) return
  try {
    await post('/steps', { taskId: task.id, title, type: 'step' })
    task._newStepTitle = ''
    const steps = await get('/steps?taskId=' + task.id)
    const wbTask = workbenchTasks.value.find(t => t.id === task.id)
    if (wbTask) wbTask.steps = steps
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

/* --- Lane --- */
.lane {
  display: flex; flex-direction: column; gap: var(--sp-3);
}

/* Lane header card */
.lane-header {
  padding: var(--sp-3) var(--sp-3);
  border-top: 3px solid var(--c-primary);
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
.lane-bg-label { word-break: break-all; }
.lane-bg-desc {
  background: var(--c-bg);
  color: var(--c-text-2);
}

/* --- Flow --- */
.lane-flow {
  display: flex; flex-direction: column;
  align-items: stretch;
}
.lane-no-steps {
  text-align: center; padding: var(--sp-6) 0;
  color: var(--c-text-3); font-size: var(--fs-sm);
}

/* Connector line */
.flow-connector {
  width: 2px; height: 20px;
  background: var(--c-border-2);
  margin-left: 18px;
  transition: background var(--t-fast);
}
.flow-connector.done { background: var(--c-green); }

/* Node */
.flow-node {
  display: flex; align-items: center; gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  cursor: pointer;
  transition: all var(--t-fast) var(--ease-smooth);
  position: relative;
}
.flow-node:hover {
  border-color: var(--c-primary);
  box-shadow: var(--shadow-sm);
}

.flow-node.node-start { border-left: 3px solid var(--c-green); }
.flow-node.node-end   { border-left: 3px solid var(--c-primary); }
.flow-node.node-branch{ border-left: 3px solid var(--c-orange); }
.flow-node.node-step  { border-left: 3px solid var(--c-blue); }

.flow-node.node-done {
  opacity: 0.55;
  background: var(--c-green-soft);
}
.flow-node.node-done .node-icon { color: var(--c-green); }
.flow-node.node-done .node-title { text-decoration: line-through; }

.flow-node.node-active {
  border-color: var(--c-primary);
  box-shadow: 0 0 0 2px var(--c-primary-soft);
  animation: pulse 2s ease-in-out infinite;
}

.node-icon {
  font-size: 14px; width: 20px; text-align: center;
  flex-shrink: 0;
  color: var(--c-text-2);
}
.node-title { flex: 1; font-size: var(--fs-sm); font-weight: var(--fw-medium); }
.node-type {
  font-size: var(--fs-xs); padding: 1px 5px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
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
  padding: var(--sp-2);
}
.lane-quick-add {
  display: flex; gap: var(--sp-1);
}
.input-sm {
  height: 30px; font-size: var(--fs-sm);
  padding: 0 var(--sp-2);
}
.lane-done-label {
  text-align: center; font-size: var(--fs-sm);
  color: var(--c-green); font-weight: var(--fw-medium);
}
</style>
