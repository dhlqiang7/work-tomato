<template>
  <div class="view task-view">
    <!-- 顶部操作栏 -->
    <div class="view-toolbar">
      <div class="toolbar-left">
        <h2 class="view-title">任务</h2>
        <div class="filter-group">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input
              v-model="filter.keyword"
              class="search-input-sm"
              placeholder="搜索任务..."
              @input="onSearch"
              @keyup.escape="filter.keyword = ''; load()"
            />
          </div>
          <select v-model="filter.status" class="select select-sm" @change="load">
            <option value="undone">非已完成</option>
            <option value="">全部状态</option>
            <option value="pending">待办</option>
            <option value="active">进行中</option>
            <option value="done">已完成</option>
          </select>
          <select v-model="filter.projectId" class="select select-sm" @change="load">
            <option value="">全部项目</option>
            <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.title }}</option>
          </select>
          <select v-model="filter.priority" class="select select-sm" @change="load">
            <option value="">全部优先级</option>
            <option value="P0">🔴 P0 紧急</option>
            <option value="P1">🟠 P1 高</option>
            <option value="P2">🔵 P2 中</option>
            <option value="P3">⚪ P3 低</option>
          </select>
        </div>
      </div>
      <button class="btn btn-primary" @click="openCreate">
        <span>＋</span> 新建任务
      </button>
    </div>

    <div v-if="loading" class="loading-state">加载中...</div>
    <template v-else>
    <!-- 任务列表 -->
    <div class="task-list" v-if="tasks.length">
      <TransitionGroup name="task-list">
        <div
          v-for="(task, idx) in tasks"
          :key="task.id"
          class="task-card card"
          :class="{ 'task-done': task.status === 'done', 'task-overdue': isOverdue(task) }"
          :style="{ animationDelay: idx * 40 + 'ms' }"
        >
          <div class="task-main" @click="openEdit(task)" :style="task.status === 'done' ? 'cursor:default' : ''">
            <div class="task-left">
              <button
                class="task-check"
                :class="{ checked: task.status === 'done' }"
                @click.stop="toggleDone(task)"
              >
                <span v-if="task.status === 'done'">✓</span>
              </button>
            </div>
            <div class="task-body">
              <div class="task-title-row">
                <span class="task-title">{{ task.title }}</span>
                <span class="badge priority-badge" :class="'priority-' + task.priority">
                  {{ task.priority }}
                </span>
              </div>
              <div v-if="task.description" class="task-desc-preview">{{ task.description }}</div>
              <div class="task-meta">
                <span v-if="task.projectTitle" class="task-project-badge">
                  📁 {{ task.projectTitle }}
                </span>
                <span v-if="task.deadline" class="task-deadline" :class="{ overdue: isOverdue(task) }">
                  📅 {{ formatDate(task.deadline) }}
                </span>
                <span v-if="task.estimatedPomodoros > 0" class="task-pomodoro-count">
                  🍅 {{ task.completedPomodoros }}/{{ task.estimatedPomodoros }}
                </span>
                <span v-if="task.tags?.length" class="task-tags">
                  <span v-for="tag in task.tags" :key="tag" class="badge badge-blue">{{ tag }}</span>
                </span>
                <span v-if="task.relatedPeople?.length" class="task-people">
                  <span v-for="person in task.relatedPeople" :key="person" class="badge badge-orange">👤 {{ person }}</span>
                </span>
              </div>
            </div>
            <div class="task-actions" @click.stop>
              <button class="btn btn-sm btn-ghost" @click="startPomodoro(task)" title="开始专注">🍅</button>
              <button class="btn btn-sm btn-ghost" @click="openSteps(task)" title="步骤分解">📋</button>
              <button class="btn btn-sm btn-ghost" @click="confirmDelete(task)" title="删除">🗑️</button>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>
    <div v-else class="empty-state">
      <div class="icon">📋</div>
      <div class="title">暂无任务</div>
      <div class="desc">点击「新建任务」开始规划你的工作</div>
    </div>
    </template>

    <!-- 新建/编辑弹窗 -->
    <Modal v-model="showModal" :title="editingTask ? '编辑任务' : '新建任务'">
      <form @submit.prevent="saveTask">
        <div class="form-group">
          <label class="form-label">任务标题 *</label>
          <input v-model="form.title" class="input" placeholder="输入任务标题" required />
        </div>
        <div class="form-group">
          <label class="form-label">描述</label>
          <textarea v-model="form.description" class="textarea" placeholder="补充说明（可选）"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">工作背景</label>
          <textarea v-model="form.background" class="textarea" placeholder="如：使用 Claude Code / IDEA 开发，当前在等待 CI 构建..." style="min-height:50px"></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">所属项目</label>
            <select v-model="form.projectId" class="select">
              <option value="default">日常工作</option>
              <option v-for="p in projects.filter(x => x.id !== 'default')" :key="p.id" :value="p.id">{{ p.title }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">优先级</label>
            <select v-model="form.priority" class="select">
              <option value="P0">P0 紧急</option>
              <option value="P1">P1 高</option>
              <option value="P2">P2 中</option>
              <option value="P3">P3 低</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">截止时间</label>
            <input v-model="form.deadline" class="input" type="datetime-local" />
          </div>
          <div class="form-group">
            <label class="form-label">预估番茄数</label>
            <input v-model.number="form.estimatedPomodoros" class="input" type="number" min="0" max="20" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">标签（逗号分隔）</label>
          <input v-model="tagsInput" class="input" placeholder="如：设计, 前端, 文档" />
        </div>
        <div class="form-group">
          <label class="form-label">关联人员（逗号分隔）</label>
          <input v-model="peopleInput" class="input" placeholder="如：张三, 李四" />
        </div>
      </form>
      <template #footer>
        <button class="btn" @click="showModal = false">取消</button>
        <button class="btn btn-primary" @click="saveTask">{{ editingTask ? '保存' : '创建' }}</button>
      </template>
    </Modal>

    <!-- 完成弹窗 -->
    <Modal v-model="showCompleteModal" title="完成工作" width="420px">
      <div class="complete-task-name">{{ completingTask?.title }}</div>
      <div class="form-group">
        <label class="form-label">工作成果（可选）</label>
        <textarea v-model="completeResult" class="textarea" placeholder="补充描述你完成的工作成果..."></textarea>
      </div>
      <template #footer>
        <button class="btn" @click="showCompleteModal = false">取消</button>
        <button class="btn btn-primary" @click="doComplete">确认完成</button>
      </template>
    </Modal>

    <!-- 步骤管理弹窗 -->
    <Modal v-model="showStepsModal" :title="'步骤管理 - ' + (stepsTask?.title || '')" width="560px">
      <div class="steps-list">
        <div v-if="stepsList.length === 0" class="steps-empty">暂无步骤，点击下方按钮添加</div>
        <div
          v-for="(s, i) in stepsList"
          :key="s.id"
          class="step-item"
          :class="['step-' + s.type, { 'drag-over': dragOverIdx === i }]"
          draggable="true"
          @dragstart="onDragStart(i, $event)"
          @dragover.prevent="onDragOver(i)"
          @dragleave="onDragLeave"
          @drop.prevent="onDrop(i)"
          @dragend="onDragEnd"
        >
          <span class="step-drag-handle" title="拖拽排序">⠿</span>
          <span class="step-type-badge" :class="'badge-' + stepTypeColor(s.type)">{{ stepTypeLabel(s.type) }}</span>
          <span class="step-title" :class="{ 'step-done': s.status === 'done' }">{{ s.title }}</span>
          <div class="step-item-actions">
            <button class="btn btn-sm btn-ghost" @click="toggleStepDone(s)" :title="s.status === 'done' ? '取消完成' : '标记完成'">
              {{ s.status === 'done' ? '↩' : '✓' }}
            </button>
            <button class="btn btn-sm btn-ghost" @click="deleteStep(s.id)" title="删除">🗑️</button>
          </div>
        </div>
      </div>
      <div class="step-add">
        <input v-model="newStepTitle" class="input" placeholder="新步骤标题" @keyup.enter="addStep" style="flex:1" />
        <select v-model="newStepType" class="select select-sm" style="width:auto">
          <option value="start">开始</option>
          <option value="step">步骤</option>
          <option value="branch">分支</option>
          <option value="end">结束</option>
        </select>
        <button class="btn btn-primary btn-sm" @click="addStep">添加</button>
      </div>
      <template #footer>
        <button class="btn" @click="showStepsModal = false">关闭</button>
      </template>
    </Modal>

    <ConfirmDialog ref="confirmDialog" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'
import Modal from '@/components/common/Modal.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

const { get, post, put, del } = useApi()
const toast = useToast()
const loading = ref(true)
const emit = defineEmits(['startPomodoro'])
const confirmDialog = ref(null)

const tasks = ref([])
const projects = ref([])
const showModal = ref(false)
const showCompleteModal = ref(false)
const editingTask = ref(null)
const completingTask = ref(null)
const completeResult = ref('')
const tagsInput = ref('')
const peopleInput = ref('')

const filter = reactive({ status: 'undone', projectId: '', priority: '', keyword: '' })
let searchTimer = null
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(load, 300)
}

const defaultForm = {
  title: '', description: '', projectId: 'default',
  priority: 'P2', deadline: '', estimatedPomodoros: 0,
  tags: [], relatedPeople: [], background: ''
}
const form = reactive({ ...defaultForm })

async function load() {
  loading.value = true
  const params = new URLSearchParams()
  if (filter.status && filter.status !== 'undone') {
    params.set('status', filter.status)
  }
  if (filter.projectId) params.set('projectId', filter.projectId)
  if (filter.priority) params.set('priority', filter.priority)
  if (filter.keyword) params.set('keyword', filter.keyword)

  try {
    const [taskList, projectList] = await Promise.all([
      get('/tasks?' + params.toString()),
      get('/projects')
    ])
    projects.value = projectList
    const projectMap = Object.fromEntries(projectList.map(p => [p.id, p.title]))
    let result = taskList.map(t => ({ ...t, projectTitle: projectMap[t.projectId] || '日常工作' }))
    if (filter.status === 'undone') {
      result = result.filter(t => t.status !== 'done')
    }
    tasks.value = result
  } catch (e) {
    toast.error(e.message)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingTask.value = null
  Object.assign(form, defaultForm)
  tagsInput.value = ''
  peopleInput.value = ''
  showModal.value = true
}

function openEdit(task) {
  if (task.status === 'done') return
  editingTask.value = task
  Object.assign(form, {
    title: task.title,
    description: task.description || '',
    projectId: task.projectId || 'default',
    priority: task.priority || 'P2',
    deadline: task.deadline ? task.deadline.slice(0, 16) : '',
    estimatedPomodoros: task.estimatedPomodoros || 0,
    background: task.background || '',
  })
  tagsInput.value = (task.tags || []).join(', ')
  peopleInput.value = (task.relatedPeople || []).join(', ')
  showModal.value = true
}

async function saveTask() {
  if (!form.title.trim()) return
  // 校验优先级
  if (!['P0', 'P1', 'P2', 'P3'].includes(form.priority)) form.priority = 'P2'
  // 校验预估番茄数
  if (typeof form.estimatedPomodoros !== 'number' || form.estimatedPomodoros < 0) form.estimatedPomodoros = 0
  if (form.estimatedPomodoros > 20) form.estimatedPomodoros = 20

  const payload = {
    ...form,
    deadline: form.deadline || null,
    tags: tagsInput.value ? tagsInput.value.split(/[,，]/).map(s => s.trim()).filter(Boolean) : [],
    relatedPeople: peopleInput.value ? peopleInput.value.split(/[,，]/).map(s => s.trim()).filter(Boolean) : [],
  }
  try {
    if (editingTask.value) {
      await put(`/tasks/${editingTask.value.id}`, payload)
      toast.success('任务已更新')
    } else {
      await post('/tasks', payload)
      toast.success('任务已创建')
    }
    showModal.value = false
    await load()
  } catch (e) {
    toast.error(e.message)
  }
}

function toggleDone(task) {
  if (task.status === 'done') return
  completingTask.value = task
  completeResult.value = ''
  showCompleteModal.value = true
}

async function doComplete() {
  try {
    await post(`/tasks/${completingTask.value.id}/complete`, { completedResult: completeResult.value })
    toast.success('任务已完成 🎉')
    showCompleteModal.value = false
    await load()
  } catch (e) {
    toast.error(e.message)
  }
}

async function confirmDelete(task) {
  if (!await confirmDialog.value?.show(`确定删除「${task.title}」？`)) return
  try {
    await del(`/tasks/${task.id}`)
    toast.success('已删除')
    await load()
  } catch (e) {
    toast.error(e.message)
  }
}

function startPomodoro(task) {
  emit('startPomodoro', task)
}

// --- 步骤管理 ---
const showStepsModal = ref(false)
const stepsTask = ref(null)
const stepsList = ref([])
const newStepTitle = ref('')
const newStepType = ref('step')
const dragIdx = ref(-1)
const dragOverIdx = ref(-1)

const stepTypeLabels = { start: '开始', step: '步骤', branch: '分支', end: '结束' }
function stepTypeLabel(type) { return stepTypeLabels[type] || '步骤' }
function stepTypeColor(type) {
  return { start: 'green', step: 'blue', branch: 'orange', end: 'primary' }[type] || 'blue'
}

async function openSteps(task) {
  stepsTask.value = task
  showStepsModal.value = true
  newStepTitle.value = ''
  newStepType.value = 'step'
  try {
    stepsList.value = await get('/steps?taskId=' + task.id)
  } catch (e) {
    toast.error('加载步骤失败')
    stepsList.value = []
  }
}

async function addStep() {
  if (!newStepTitle.value.trim()) return
  try {
    await post('/steps', { taskId: stepsTask.value.id, title: newStepTitle.value.trim(), type: newStepType.value })
    newStepTitle.value = ''
    // 刷新后把新步骤排到"完成"之前
    const all = await get('/steps?taskId=' + stepsTask.value.id)
    const endIdx = all.findIndex(s => s.type === 'end')
    if (endIdx !== -1) {
      const endStep = all.splice(endIdx, 1)[0]
      all.push(endStep)
      await put('/steps/reorder/batch', { items: all.map((s, i) => ({ id: s.id, order: i })) })
    }
    stepsList.value = await get('/steps?taskId=' + stepsTask.value.id)
  } catch (e) {
    toast.error(e.message)
  }
}

async function toggleStepDone(step) {
  const newStatus = step.status === 'done' ? 'pending' : 'done'
  try {
    await put('/steps/' + step.id, { status: newStatus })
    stepsList.value = await get('/steps?taskId=' + stepsTask.value.id)
  } catch (e) {
    toast.error(e.message)
  }
}

async function deleteStep(id) {
  try {
    await del('/steps/' + id)
    stepsList.value = await get('/steps?taskId=' + stepsTask.value.id)
  } catch (e) {
    toast.error(e.message)
  }
}

// --- 拖拽排序 ---
function onDragStart(idx, e) {
  dragIdx.value = idx
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', idx)
}
function onDragOver(idx) {
  dragOverIdx.value = idx
}
function onDragLeave() {
  dragOverIdx.value = -1
}
async function onDrop(targetIdx) {
  const from = dragIdx.value
  dragOverIdx.value = -1
  dragIdx.value = -1
  if (from === targetIdx) return
  const list = [...stepsList.value]
  const [moved] = list.splice(from, 1)
  list.splice(targetIdx, 0, moved)
  // 更新 order
  const updated = list.map((s, i) => ({ ...s, order: i }))
  stepsList.value = updated
  // 持久化
  try {
    await put('/steps/reorder/batch', { items: updated.map(s => ({ id: s.id, order: s.order })) })
  } catch (e) {
    toast.error('排序保存失败')
  }
}
function onDragEnd() {
  dragIdx.value = -1
  dragOverIdx.value = -1
}

function isOverdue(task) {
  if (!task.deadline || task.status === 'done') return false
  return new Date(task.deadline) < new Date()
}

function formatDate(d) {
  const date = new Date(d)
  return `${date.getMonth()+1}/${date.getDate()} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`
}

onMounted(load)
onUnmounted(() => clearTimeout(searchTimer))
</script>

<style scoped>
.view {
  flex: 1; overflow-y: auto;
  padding: var(--sp-5);
  animation: fadeIn 0.3s var(--ease-smooth);
}
.view-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: var(--sp-4);
  gap: var(--sp-4);
  flex-wrap: wrap;
}
.view-title {
  font-family: var(--f-display);
  font-size: var(--fs-2xl);
  font-weight: var(--fw-bold);
  color: var(--c-text);
  letter-spacing: -0.01em;
}
.toolbar-left {
  display: flex; align-items: center; gap: var(--sp-5);
}
.filter-group {
  display: flex; gap: var(--sp-3); align-items: center;
}
.select-sm {
  width: auto; min-width: 110px;
  padding: var(--sp-1) var(--sp-3);
  height: 32px;
  font-size: var(--fs-sm);
  line-height: 28px;
  padding-right: 28px;
  box-sizing: border-box;
}
.search-box {
  position: relative;
  width: 180px;
  flex-shrink: 0;
}
.search-icon {
  position: absolute; left: 8px; top: 50%;
  transform: translateY(-50%);
  font-size: 12px; opacity: 0.5;
  pointer-events: none;
}
.search-input-sm {
  width: 100%; height: 32px;
  padding: 0 28px 0 28px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
  color: var(--c-text);
  font-size: var(--fs-sm);
  font-family: var(--f-body);
  line-height: 28px;
  box-sizing: border-box;
  outline: none;
  transition: all var(--t-fast) var(--ease-smooth);
}
.search-input-sm:focus {
  border-color: var(--c-primary);
  box-shadow: 0 0 0 3px var(--c-primary-soft);
}
.search-input-sm::placeholder { color: var(--c-text-3); }

/* Task list */
.task-list {
  display: flex; flex-direction: column; gap: var(--sp-2);
}
.task-card {
  padding: 0;
  animation: slideUp 0.3s var(--ease-smooth) both;
}
.task-card.task-done { opacity: 0.55; }
.task-card.task-overdue { border-left: 3px solid var(--c-primary); }

.task-main {
  display: flex; align-items: flex-start; gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  cursor: pointer;
  transition: background var(--t-fast);
  border-radius: var(--radius-lg);
}
.task-main:hover { background: var(--c-bg); }

.task-check {
  width: 20px; height: 20px;
  border: 2px solid var(--c-border-2);
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; color: #fff;
  flex-shrink: 0;
  margin-top: 2px;
  transition: all var(--t-fast) var(--ease-smooth);
}
.task-check:hover { border-color: var(--c-primary); }
.task-check.checked {
  background: var(--c-green);
  border-color: var(--c-green);
}

.task-body { flex: 1; min-width: 0; }
.task-title-row {
  display: flex; align-items: center; gap: var(--sp-2);
  margin-bottom: var(--sp-1);
}
.task-title {
  font-size: var(--fs-md);
  font-weight: var(--fw-medium);
  color: var(--c-text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.task-done .task-title { text-decoration: line-through; }

.task-desc-preview {
  font-size: var(--fs-sm);
  color: var(--c-text-3);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  margin-bottom: var(--sp-1);
  max-width: 100%;
}
.task-meta {
  display: flex; align-items: center; gap: var(--sp-3);
  flex-wrap: wrap;
}
.task-project-badge, .task-deadline, .task-pomodoro-count {
  font-size: var(--fs-xs);
  color: var(--c-text-2);
}
.task-deadline.overdue { color: var(--c-primary); font-weight: var(--fw-semibold); }
.task-tags { display: flex; gap: 4px; }
.task-people { display: flex; gap: 4px; }

.task-actions {
  display: flex; gap: 2px;
  opacity: 0;
  transition: opacity var(--t-fast);
  flex-shrink: 0;
}
.task-card:hover .task-actions { opacity: 1; }

.priority-badge { font-family: var(--f-mono); font-size: 11px; letter-spacing: 0.03em; }

.form-row {
  display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-4);
}
.form-row .form-group + .form-group { margin-top: 0; }
.complete-task-name {
  font-weight: var(--fw-semibold);
  font-size: var(--fs-md);
  margin-bottom: var(--sp-4);
  color: var(--c-primary);
}

/* Transition */
.task-list-enter-active { transition: all 0.3s var(--ease-spring); }
.task-list-leave-active { transition: all 0.2s var(--ease-smooth); }
.task-list-enter-from { opacity: 0; transform: translateY(-8px); }
.task-list-leave-to { opacity: 0; transform: translateX(20px); }
.task-list-move { transition: transform 0.3s var(--ease-smooth); }

/* Step management */
.steps-list {
  display: flex; flex-direction: column; gap: var(--sp-2);
  margin-bottom: var(--sp-4);
  max-height: 320px; overflow-y: auto;
}
.steps-empty {
  text-align: center; color: var(--c-text-3);
  padding: var(--sp-6) 0; font-size: var(--fs-sm);
}
.step-item {
  display: flex; align-items: center; gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  transition: transform 0.15s var(--ease-smooth), box-shadow 0.15s var(--ease-smooth), border-color 0.15s var(--ease-smooth);
  cursor: grab;
}
.step-item:active { cursor: grabbing; }
.step-item.drag-over {
  border-color: var(--c-primary);
  box-shadow: 0 0 0 2px var(--c-primary-soft);
  transform: translateY(2px);
}
.step-drag-handle {
  color: var(--c-text-3); font-size: 16px;
  cursor: grab; line-height: 1; flex-shrink: 0;
  user-select: none;
}
.step-drag-handle:active { cursor: grabbing; }
.step-item.step-start { border-left: 3px solid var(--c-green); }
.step-item.step-end { border-left: 3px solid var(--c-primary); }
.step-item.step-branch { border-left: 3px solid var(--c-orange); }
.step-item.step-step { border-left: 3px solid var(--c-blue); }
.step-type-badge {
  font-size: var(--fs-xs); padding: 1px 6px;
  border-radius: var(--radius-full); flex-shrink: 0;
}
.step-title { flex: 1; font-size: var(--fs-base); }
.step-title.step-done { text-decoration: line-through; color: var(--c-text-3); }
.step-item-actions {
  display: flex; gap: 2px; opacity: 0;
  transition: opacity var(--t-fast);
}
.step-item:hover .step-item-actions { opacity: 1; }
.step-add {
  display: flex; gap: var(--sp-2); align-items: center;
}
</style>
