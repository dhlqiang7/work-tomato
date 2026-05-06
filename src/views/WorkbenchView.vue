<template>
  <div class="view workbench-view">
    <div class="view-toolbar">
      <h2 class="view-title">工作台</h2>
      <button class="btn" @click="showAddDialog = true">＋ 添加任务</button>
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
            <div v-if="flowBlocks(task).length === 0" class="lane-no-steps">
              暂无步骤，请在任务页分解
            </div>
            <template v-else>
              <template v-for="(block, bi) in flowBlocks(task)" :key="block.key">
                <!-- 连接区（整行宽度的拖放目标） -->
                <div
                  v-if="block.connector"
                  class="flow-connector-wrap"
                  :class="{ 'drag-over': isConnectorDragOver(task, block) }"
                  @dragover.prevent="onConnectorDragOver(task, block.dropIdx)"
                  @dragleave="onConnectorDragLeave(task)"
                  @drop.prevent="onConnectorDrop(task, block.dropIdx)"
                >
                  <div class="flow-connector" :class="{ done: block.connectorDone }"></div>
                </div>

                <!-- 单步骤节点 -->
                <template v-if="block.type === 'single'">
                  <StepNode
                    :step="block.step"
                    :task="task"
                    :step-idx="block.stepIdx"
                    :done="block.step.status === 'done'"
                    :active="isActiveStep(task, block.stepIdx)"
                    @mark-done="markStepDone"
                    @mark-undone="markStepUndone"
                    @edit="startEditStep"
                    @save-title="saveStepTitle"
                    @delete="deleteFlowStep"
                    @drag-start="onFlowDragStart"
                    @drag-over-node="onNodeDragOver"
                    @drag-leave-node="onNodeDragLeave"
                    @drop-node="onNodeDrop"
                    @drag-end="onFlowDragEnd"
                  />
                </template>

                <!-- 分支组（横向并排） -->
                <div
                  v-if="block.type === 'branches'"
                  class="branch-row"
                  @dragover.prevent="onBranchRowDragOver(task, block.firstIdx)"
                  @dragleave="onBranchRowDragLeave(task)"
                  @drop.prevent="onBranchRowDrop(task, block.firstIdx)"
                >
                  <StepNode
                    v-for="bs in block.steps"
                    :key="bs.id"
                    :step="bs"
                    :task="task"
                    :step-idx="block.stepIdxMap[bs.id]"
                    :done="bs.status === 'done'"
                    :active="isActiveStep(task, block.stepIdxMap[bs.id])"
                    :in-branch="true"
                    @mark-done="markStepDone"
                    @mark-undone="markStepUndone"
                    @edit="startEditStep"
                    @save-title="saveStepTitle"
                    @delete="deleteFlowStep"
                    @drag-start="onFlowDragStart"
                    @drag-over-node="onNodeDragOver"
                    @drag-leave-node="onNodeDragLeave"
                    @drop-node="onNodeDrop"
                    @drag-end="onFlowDragEnd"
                  />
                </div>
              </template>
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
              <select v-model="task._newStepType" class="select select-sm select-muted" style="width:auto;min-width:70px">
                <option value="step">步骤</option>
                <option value="branch">分支</option>
              </select>
              <button class="btn btn-sm" @click="quickAddStep(task)">＋</button>
            </div>
            <button class="btn btn-sm" @click="markAllStepsDone(task)" v-if="task.status !== 'done'">✓ 标记全部完成</button>
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
import StepNode from '@/components/common/StepNode.vue'

const { get, post, put, del } = useApi()
const toast = useToast()
const confirmDialog = ref(null)
const loading = ref(true)

const workbenchTasks = ref([])
const allTasks = ref([])
const showAddDialog = ref(false)
const addTaskId = ref('')
const availableTasks = ref([])

const flowDrag = ref({})

function isDraggable(step) {
  return step.type !== 'start' && step.type !== 'end'
}

function isActiveStep(task, idx) {
  const steps = task.steps || []
  if (steps.length === 0) return false
  const firstUndone = steps.findIndex(s => s.status !== 'done')
  if (firstUndone === -1) return false
  return idx === firstUndone
}

// --- 流程块（分组连续分支） ---
function flowBlocks(task) {
  const steps = task.steps || []
  if (steps.length === 0) return []
  const blocks = []

  let i = 0
  while (i < steps.length) {
    // 收集连续的分支
    if (steps[i].type === 'branch') {
      const branchSteps = []
      const firstIdx = i
      const stepIdxMap = {}
      while (i < steps.length && steps[i].type === 'branch') {
        stepIdxMap[steps[i].id] = i
        branchSteps.push(steps[i])
        i++
      }
      blocks.push({
        key: 'branch-' + firstIdx,
        type: 'branches',
        steps: branchSteps,
        firstIdx,
        stepIdxMap,
        connector: firstIdx > 0,
        connectorDone: firstIdx > 0 ? steps[firstIdx - 1]?.status === 'done' : false,
        dropIdx: firstIdx
      })
    } else {
      blocks.push({
        key: 'step-' + i,
        type: 'single',
        step: steps[i],
        stepIdx: i,
        connector: i > 0,
        connectorDone: i > 0 ? steps[i - 1]?.status === 'done' : false,
        dropIdx: i
      })
      i++
    }
  }

  return blocks
}

// --- 连线拖放目标判断 ---
function isConnectorDragOver(task, block) {
  return flowDrag.value.taskId === task.id && flowDrag.value.overConnector === block.dropIdx
}
function onConnectorDragOver(task, idx) {
  if (flowDrag.value.taskId === task.id) {
    flowDrag.value.overConnector = idx
    flowDrag.value.over = -1
  }
}
function onConnectorDragLeave(task) {
  if (flowDrag.value.taskId === task.id) {
    flowDrag.value.overConnector = -1
  }
}
async function onConnectorDrop(task, targetIdx) {
  await doDrop(task, targetIdx)
}

function onBranchRowDragOver(task, idx) {
  if (flowDrag.value.taskId === task.id) {
    flowDrag.value.overConnector = idx
    flowDrag.value.over = -1
  }
}
function onBranchRowDragLeave(task) {
  if (flowDrag.value.taskId === task.id) {
    flowDrag.value.overConnector = -1
  }
}
async function onBranchRowDrop(task, targetIdx) {
  await doDrop(task, targetIdx)
}

// --- 节点拖放 ---
function onNodeDragOver(task, idx) {
  if (flowDrag.value.taskId === task.id) {
    flowDrag.value.over = idx
    flowDrag.value.overConnector = -1
  }
}
function onNodeDragLeave(task) {
  if (flowDrag.value.taskId === task.id) {
    flowDrag.value.over = -1
  }
}
async function onNodeDrop(task, targetIdx) {
  await doDrop(task, targetIdx)
}

// --- 数据加载 ---
async function load() {
  loading.value = true
  try {
    const tasks = await get('/tasks')
    allTasks.value = tasks
    const wbTasks = tasks.filter(t => t.inWorkbench)
    const withSteps = await Promise.all(wbTasks.map(async (t) => {
      try {
        const steps = await get('/steps?taskId=' + t.id)
        return { ...t, steps: steps.map(s => ({ ...s, _editing: false, _editTitle: '' })), _newStepTitle: '', _newStepType: 'step' }
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
  } catch (e) { toast.error(e.message) }
}

async function removeFromWorkbench(task) {
  if (!await confirmDialog.value?.show(`将「${task.title}」移出工作台？`)) return
  try {
    await put('/tasks/' + task.id, { inWorkbench: false })
    await load()
    toast.success('已移出工作台')
  } catch (e) { toast.error(e.message) }
}

async function markStepDone(task, step) {
  try {
    await put('/steps/' + step.id, { status: 'done' })
    await refreshTaskSteps(task)
  } catch (e) { toast.error(e.message) }
}

async function markStepUndone(task, step) {
  try {
    await put('/steps/' + step.id, { status: 'pending' })
    await refreshTaskSteps(task)
  } catch (e) { toast.error(e.message) }
}

function startEditStep(step) {
  step._editing = true
  step._editTitle = step.title
}

async function saveStepTitle(task, step) {
  const title = (step._editTitle || '').trim()
  step._editing = false
  if (!title || title === step.title) return
  try {
    await put('/steps/' + step.id, { title })
    await refreshTaskSteps(task)
  } catch (e) { toast.error(e.message) }
}

async function deleteFlowStep(task, step) {
  if (!await confirmDialog.value?.show(`删除步骤「${step.title}」？`)) return
  try {
    await del('/steps/' + step.id)
    await refreshTaskSteps(task)
  } catch (e) { toast.error(e.message) }
}

async function refreshTaskSteps(task) {
  const wbTask = workbenchTasks.value.find(t => t.id === task.id)
  if (wbTask) {
    const steps = await get('/steps?taskId=' + task.id)
    wbTask.steps = steps.map(s => ({ ...s, _editing: false, _editTitle: '' }))
  }
}

// 快速添加（插入到完成之前）
async function quickAddStep(task) {
  const title = (task._newStepTitle || '').trim()
  if (!title) return
  try {
    await post('/steps', { taskId: task.id, title, type: task._newStepType || 'step' })
    task._newStepTitle = ''
    // 刷新后把新步骤排到"完成"之前
    const steps = await get('/steps?taskId=' + task.id)
    const endIdx = steps.findIndex(s => s.type === 'end')
    if (endIdx !== -1) {
      const endStep = steps.splice(endIdx, 1)[0]
      steps.push(endStep)
      await put('/steps/reorder/batch', { items: steps.map((s, i) => ({ id: s.id, order: i })) })
    }
    await refreshTaskSteps(task)
  } catch (e) { toast.error(e.message) }
}

// 标记全部完成
async function markAllStepsDone(task) {
  if (!await confirmDialog.value?.show(`将「${task.title}」的所有步骤标记为完成？`)) return
  try {
    const steps = task.steps || []
    for (const s of steps) {
      if (s.status !== 'done') {
        await put('/steps/' + s.id, { status: 'done' })
      }
    }
    await put('/tasks/' + task.id, { status: 'done', inWorkbench: false })
    await load()
    toast.success('任务全部完成')
  } catch (e) { toast.error(e.message) }
}

// --- 拖拽排序 ---
function onFlowDragStart(task, idx, e) {
  const step = (task.steps || [])[idx]
  if (!isDraggable(step)) { e.preventDefault(); return }
  flowDrag.value = { taskId: task.id, from: idx, over: -1, overConnector: -1 }
  e.dataTransfer.effectAllowed = 'move'
}

async function doDrop(task, targetIdx) {
  const { taskId, from } = flowDrag.value
  if (taskId !== task.id || from === targetIdx) {
    flowDrag.value = {}
    return
  }
  const wbTask = workbenchTasks.value.find(t => t.id === task.id)
  if (!wbTask) { flowDrag.value = {}; return }

  const steps = wbTask.steps || []
  const fromStep = steps[from]
  if (!fromStep || !isDraggable(fromStep)) { flowDrag.value = {}; return }

  // 不能拖到开始之前或结束之后
  const clampTarget = Math.max(1, Math.min(targetIdx, steps.length - 2))

  const list = [...steps]
  const [moved] = list.splice(from, 1)
  // 调整 target（splice 后索引会变）
  const adjTarget = from < clampTarget ? clampTarget - 1 : clampTarget
  list.splice(adjTarget, 0, moved)

  const reordered = list.map((s, i) => ({ ...s, order: i, _editing: false, _editTitle: '' }))
  wbTask.steps = reordered
  flowDrag.value = {}

  try {
    await put('/steps/reorder/batch', { items: reordered.map(s => ({ id: s.id, order: s.order })) })
  } catch (e) {
    toast.error('排序保存失败')
  }
}

async function onFlowDragEnd(task) {
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

.swimlanes {
  display: grid;
  grid-template-columns: repeat(var(--lane-count, 1), minmax(280px, 1fr));
  gap: var(--sp-4);
  align-items: start;
}

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

/* Connector wrap — 整行宽度的拖放目标 */
.flow-connector-wrap {
  height: 24px;
  display: flex; align-items: center;
  justify-content: center;
  transition: background var(--t-fast);
  border-radius: var(--radius-sm);
  margin: 2px 0;
}
.flow-connector-wrap.drag-over { background: var(--c-primary-soft); }
.flow-connector {
  width: 2px; height: 100%;
  background: var(--c-border-2);
  transition: background var(--t-fast);
}
.flow-connector.done { background: var(--c-green); }

/* Branch row */
.branch-row {
  display: flex; gap: var(--sp-2);
  flex-wrap: wrap;
  padding: var(--sp-1) 0;
  transition: background var(--t-fast);
  border-radius: var(--radius-md);
  min-height: 36px;
}
.branch-node {
  flex: 1; min-width: 0;
}

/* Lane actions */
.lane-actions {
  display: flex; flex-direction: column; gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  border-top: 1px solid var(--c-border);
}
.lane-quick-add { display: flex; gap: var(--sp-1); }
.input-sm { height: 30px; font-size: var(--fs-sm); padding: 0 var(--sp-2); flex: 1; }
.select-muted {
  color: var(--c-text-2); border-color: var(--c-border);
  background: var(--c-surface);
}
.select-muted:focus { border-color: var(--c-border-2); box-shadow: none; }
.lane-done-label {
  text-align: center; font-size: var(--fs-sm);
  color: var(--c-green); font-weight: var(--fw-medium);
}
</style>
