<template>
  <div class="view schedule-view">
    <div class="view-toolbar">
      <h2 class="view-title">计划表</h2>
      <div class="toolbar-actions">
        <div class="view-tabs">
          <button class="tab-btn" :class="{ active: viewMode === 'week' }" @click="viewMode = 'week'">周视图</button>
          <button class="tab-btn" :class="{ active: viewMode === 'month' }" @click="viewMode = 'month'">月视图</button>
        </div>
        <button class="btn btn-sm" @click="goToday">当前时间</button>
        <button class="btn btn-sm btn-ghost" @click="navWeek(-1)">◀</button>
        <span class="week-label">{{ weekLabel }}</span>
        <button class="btn btn-sm btn-ghost" @click="navWeek(1)">▶</button>
        <button class="btn btn-sm btn-ghost" @click="showConfig = true" title="配置">⚙</button>
        <button class="btn" @click="openAdd">＋ 新增计划</button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">加载中...</div>
    <template v-else>

      <!-- ====== 周视图 ====== -->
      <div v-if="viewMode === 'week'" class="week-view">
        <div class="week-grid">
          <!-- 表头 -->
          <div class="week-header">
            <div class="time-gutter"></div>
            <div v-for="d in weekDays" :key="d.date" class="day-header" :class="{ today: d.isToday }">
              <span class="day-name">{{ d.label }}</span>
              <span class="day-date">{{ d.dayNum }}</span>
            </div>
          </div>

          <!-- 时间网格 -->
          <div class="week-body">
            <div class="time-gutter">
              <div v-for="h in hours" :key="h" class="hour-label">{{ String(h).padStart(2,'0') }}:00</div>
            </div>
            <div v-for="d in weekDays" :key="d.date" class="day-col" :class="{ today: d.isToday }"
              @dragover.prevent="onDayDragOver(d, $event)"
              @drop.prevent="onDayDrop(d, $event)"
              @dragleave="onSlotDragLeave">
              <!-- 休息时间块 -->
              <div
                v-for="(rp, ri) in config.restPeriods"
                :key="'rest'+ri"
                class="rest-block"
                :style="restStyle(rp)"
              ></div>
              <div v-for="h in hours" :key="h" class="hour-slot"
                @dragover.prevent="onSlotDragOver(d, h, $event)"
                @dragleave="onSlotDragLeave"
                @drop.prevent="onSlotDrop(d, h, $event)">
              </div>
              <!-- 条目 -->
              <div
                v-for="item in getDayItems(d.date)"
                :key="item.id"
                class="schedule-item"
                :class="{ 'has-task': item.taskId }"
                :style="itemStyle(item)"
                :draggable="!item._resizing"
                @dragstart="onItemDragStart(item, d.date, $event)"
                @dragend="onItemDragEnd"
                @click="openEdit(item)"
              >
                <div class="si-time">{{ fmtTime(item.startHour, item.startMinute) }}-{{ fmtTime(item.endHour, item.endMinute) }}</div>
                <div class="si-title">{{ item.title }}</div>
                <div
                  class="si-resize"
                  @mousedown.stop="onResizeStart(item, $event)"
                  @dragstart.prevent
                ></div>
                <button class="si-delete" @click.stop="deleteItem(item)">×</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ====== 月视图 ====== -->
      <div v-if="viewMode === 'month'" class="month-view">
        <div class="month-nav">
          <button class="btn btn-sm btn-ghost" @click="navMonth(-1)">◀</button>
          <span class="month-label">{{ monthLabel }}</span>
          <button class="btn btn-sm btn-ghost" @click="navMonth(1)">▶</button>
        </div>
        <div class="month-grid">
          <div class="mday-header" v-for="wd in ['一','二','三','四','五','六','日']" :key="wd">{{ wd }}</div>
          <div v-for="d in monthDays" :key="d.date" class="mday-cell" :class="{ today: d.isToday, other: !d.inMonth }"
            @click="openDayAdd(d.date)">
            <span class="mday-num">{{ d.dayNum }}</span>
            <div class="mday-section mday-am" @click.stop="openDayAdd(d.date, 'am')">
              <div v-for="it in d.amItems" :key="it.id" class="mday-item" :style="{ background: it.color || 'var(--c-blue)' }" @click.stop="openEdit(it)">{{ it.title }}</div>
            </div>
            <div class="mday-section mday-pm" @click.stop="openDayAdd(d.date, 'pm')">
              <div v-for="it in d.pmItems" :key="it.id" class="mday-item" :style="{ background: it.color || 'var(--c-blue)' }" @click.stop="openEdit(it)">{{ it.title }}</div>
            </div>
            <div class="mday-section mday-ev" @click.stop="openDayAdd(d.date, 'ev')">
              <div v-for="it in d.evItems" :key="it.id" class="mday-item" :style="{ background: it.color || 'var(--c-blue)' }" @click.stop="openEdit(it)">{{ it.title }}</div>
            </div>
          </div>
        </div>
      </div>

    </template>

    <!-- 新增/编辑弹窗 -->
    <Modal v-model="showModal" :title="editingItem ? '编辑计划' : '新增计划'" width="480px">
      <div class="form-group">
        <label class="form-label">选择任务 *</label>
        <div style="display:flex;gap:8px">
          <select v-model="form.taskId" class="select" :disabled="!!editingItem" style="flex:1">
            <option value="">-- 请选择 --</option>
            <option v-for="t in pendingTasks" :key="t.id" :value="t.id">{{ t.priority }} | {{ t.title }}</option>
          </select>
          <button v-if="!editingItem" class="btn btn-sm" @click="createTaskForSchedule">新建任务</button>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">日期</label>
          <input v-model="form.date" class="input" type="date" />
        </div>
        <div class="form-group">
          <label class="form-label">颜色</label>
          <div class="color-picker">
            <button
              v-for="c in ['']" :key="'none'" class="color-swatch color-none"
              :class="{ active: !form.color }"
              @click="form.color = ''"
              title="默认"
            >—</button>
            <button
              v-for="c in colors" :key="c" class="color-swatch"
              :class="{ active: form.color === c }"
              :style="{ background: c }"
              @click="form.color = c"
            ></button>
          </div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">开始时间</label>
          <input v-model="form.startHour" class="input" type="number" min="0" max="23" step="1" style="width:60px" />
        </div>
        <div class="form-group">
          <label class="form-label">结束时间</label>
          <input v-model="form.endHour" class="input" type="number" min="0" max="24" step="1" style="width:60px" />
        </div>
      </div>
      <template #footer>
        <button class="btn" @click="showModal = false">取消</button>
        <button class="btn btn-primary" @click="saveItem">{{ editingItem ? '保存' : '创建' }}</button>
      </template>
    </Modal>

    <!-- 配置弹窗 -->
    <Modal v-model="showConfig" title="计划表配置" width="420px">
      <div class="form-group">
        <label class="form-label">工作范围</label>
        <div class="form-row">
          <input v-model.number="config.workStartHour" class="input" type="number" min="0" max="23" style="width:80px" />
          <span style="padding:0 4px">—</span>
          <input v-model.number="config.workEndHour" class="input" type="number" min="1" max="24" style="width:80px" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">休息时间</label>
        <div v-for="(rp, i) in config.restPeriods" :key="i" class="form-row" style="margin-bottom:4px">
          <input v-model.number="rp.start" class="input" type="number" min="0" max="23" style="width:60px" />
          <span style="padding:0 2px">—</span>
          <input v-model.number="rp.end" class="input" type="number" min="1" max="24" style="width:60px" />
          <button class="btn btn-sm btn-ghost" @click="config.restPeriods.splice(i,1)" title="删除">×</button>
        </div>
        <button class="btn btn-sm" @click="config.restPeriods.push({start:12,end:13})">＋ 添加</button>
      </div>
      <template #footer>
        <button class="btn" @click="showConfig = false">取消</button>
        <button class="btn btn-primary" @click="saveConfig">保存</button>
      </template>
    </Modal>

    <ConfirmDialog ref="confirmDialog" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, inject } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'
import Modal from '@/components/common/Modal.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

const { get, post, put, del } = useApi()
const toast = useToast()
const openTaskCreate = inject('openTaskCreate')
const confirmDialog = ref(null)
const loading = ref(true)
const viewMode = ref('week')
const showModal = ref(false)
const showConfig = ref(false)
const editingItem = ref(null)
const pendingTasks = ref([])

const weekOffset = ref(0)
const monthOffset = ref(0)
const allItems = ref([])

const config = reactive({ workStartHour: 9, workEndHour: 22, restPeriods: [] })
const colors = ['#D94F3B','#E8943A','#5B8C5A','#4A8FBF','#9B59B6','#1ABC9C','#34495E']

const defaultForm = {
  taskId: '', date: '', startHour: 9, endHour: 10, color: ''
}
const form = reactive({ ...defaultForm })

const hours = computed(() => {
  const r = []
  for (let h = config.workStartHour; h < config.workEndHour; h++) r.push(h)
  return r
})

// --- 周视图 ---
const weekDays = computed(() => {
  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() - today.getDay() + 1 + weekOffset.value * 7)
  const days = []
  const labels = ['一','二','三','四','五','六','日']
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const ds = d.toISOString().slice(0, 10)
    days.push({
      date: ds, label: '周' + labels[i], dayNum: d.getDate(),
      isToday: ds === today.toISOString().slice(0, 10)
    })
  }
  return days
})

const weekLabel = computed(() => {
  const ds = weekDays.value
  if (!ds.length) return ''
  return ds[0].date + ' ~ ' + ds[6].date
})

function getDayItems(date) {
  const items = allItems.value.filter(i => i.date === date)
  items.sort((a, b) => a.startHour - b.startHour || (a.startMinute || 0) - (b.startMinute || 0))
  // 贪心分配列：重叠条目分配到不同列
  const cols = []
  for (const item of items) {
    let placed = false
    for (let c = 0; c < cols.length; c++) {
      if (cols[c] <= item.startHour) {
        item._col = c
        cols[c] = item.endHour
        placed = true
        break
      }
    }
    if (!placed) {
      item._col = cols.length
      cols.push(item.endHour)
    }
  }
  const totalCols = cols.length
  for (const item of items) item._cols = totalCols
  return items
}

function itemStyle(item) {
  const SLOT_H = 60
  const dur = Math.max(item.endHour - item.startHour, 1)
  const top = (item.startHour - config.workStartHour) * SLOT_H
  const h = dur * SLOT_H
  const cols = item._cols || 1
  const col = item._col || 0
  const style = {
    top: top + 'px',
    height: h + 'px',
    background: item.color || undefined
  }
  if (cols > 1) {
    style.left = `calc(${(col / cols) * 100}% + 2px)`
    style.width = `calc(${(1 / cols) * 100}% - 4px)`
  }
  return style
}

function restStyle(rp) {
  const SLOT_H = 60
  const top = (rp.start - config.workStartHour) * SLOT_H
  const h = (rp.end - rp.start) * SLOT_H
  return { top: top + 'px', height: h + 'px' }
}

// --- 月视图 ---
const monthDays = computed(() => {
  const today = new Date()
  const base = new Date(today.getFullYear(), today.getMonth() + monthOffset.value, 1)
  const year = base.getFullYear(), month = base.getMonth()
  const firstDay = new Date(year, month, 1)
  const startDow = firstDay.getDay() || 7

  const days = []
  // 填充上月末尾
  const prevLast = new Date(year, month, 0).getDate()
  for (let i = startDow - 2; i >= 0; i--) {
    const d = new Date(year, month - 1, prevLast - i)
    days.push(buildMonthDay(d, false))
  }
  // 本月
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(buildMonthDay(new Date(year, month, i), true))
  }
  // 填充下月
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    days.push(buildMonthDay(new Date(year, month + 1, i), false))
  }
  return days
})

function buildMonthDay(d, inMonth) {
  const ds = d.toISOString().slice(0, 10)
  const dayItems = allItems.value.filter(i => i.date === ds)
  const amItems = dayItems.filter(i => i.startHour < 12)
  const pmItems = dayItems.filter(i => i.startHour >= 12 && i.startHour < 18)
  const evItems = dayItems.filter(i => i.startHour >= 18)
  return {
    date: ds, dayNum: d.getDate(), inMonth,
    isToday: ds === new Date().toISOString().slice(0, 10),
    amItems, pmItems, evItems
  }
}

const monthLabel = computed(() => {
  const d = new Date(new Date().getFullYear(), new Date().getMonth() + monthOffset.value, 1)
  return d.getFullYear() + '年' + (d.getMonth() + 1) + '月'
})

function navWeek(dir) { weekOffset.value += dir }
function navMonth(dir) { monthOffset.value += dir }
function goToday() { weekOffset.value = 0; monthOffset.value = 0 }

// --- 拖拽（周视图） ---
const dragState = ref({})

function onItemDragStart(item, fromDate, e) {
  dragState.value = { itemId: item.id, fromDate, ctrl: e.ctrlKey }
  e.dataTransfer.effectAllowed = 'move'
  // 同步屏蔽所有条目指针事件，让 dragover/drop 穿透到 hour-slot
  document.querySelectorAll('.schedule-item').forEach(el => {
    el.style.pointerEvents = 'none'
  })
}

function onItemDragEnd() {
  dragState.value = {}
  // 恢复指针事件
  document.querySelectorAll('.schedule-item').forEach(el => {
    el.style.pointerEvents = ''
  })
}

function onSlotDragOver(d, h, e) {
  const slotEl = e.target
  slotEl.classList.add('drag-over')
}

function onSlotDragLeave(e) {
  e.target.classList.remove('drag-over')
}

async function onSlotDrop(d, h, e) {
  e.target.classList.remove('drag-over')
  const { itemId, fromDate, ctrl } = dragState.value
  if (!itemId) return
  dragState.value = {}

  const original = allItems.value.find(i => i.id === itemId)
  if (!original) return
  // 保持原始时长（整小时），至少1小时
  let durH = original.endHour - original.startHour
  if (durH < 1) durH = 1
  // 吸附：开始时间限制在工作范围内，且结束时间不超出工作范围
  h = Math.max(config.workStartHour, Math.min(config.workEndHour - durH, h))
  const endH = h + durH

  if (ctrl && fromDate !== d.date) {
    try {
      await post('/schedule', {
        title: original.title, description: original.description,
        taskId: original.taskId, date: d.date,
        startHour: h, startMinute: 0, endHour: endH, endMinute: 0,
        color: original.color
      })
      await loadItems()
    } catch (e) { toast.error(e.message) }
  } else {
    try {
      await put('/schedule/' + itemId, {
        date: d.date, startHour: h, startMinute: 0, endHour: endH, endMinute: 0
      })
      await loadItems()
    } catch (e) { toast.error(e.message) }
  }
}

function hourFromEvent(e) {
  const col = e.currentTarget.closest ? e.currentTarget.closest('.day-col') : e.currentTarget
  if (!col) return null
  const rect = col.getBoundingClientRect()
  const h = config.workStartHour + Math.floor((e.clientY - rect.top) / 60)
  if (h < config.workStartHour || h >= config.workEndHour) return null
  return h
}

function onDayDragOver(d, e) {
  document.querySelectorAll('.hour-slot.drag-over').forEach(el => el.classList.remove('drag-over'))
  const h = hourFromEvent(e)
  if (h == null) return
  const col = e.currentTarget.closest ? e.currentTarget.closest('.day-col') : e.currentTarget
  const idx = h - config.workStartHour
  const slot = col.querySelectorAll('.hour-slot')[idx]
  if (slot) slot.classList.add('drag-over')
}

function onDayDrop(d, e) {
  document.querySelectorAll('.hour-slot.drag-over').forEach(el => el.classList.remove('drag-over'))
  const h = hourFromEvent(e)
  if (h == null) return
  onSlotDrop(d, h, e)
}

// --- 拖拽边缘改时长 ---
let resizeCleanup = null

function onResizeStart(item, e) {
  const startY = e.clientY
  item._resizing = true
  item._origEndH = item.endHour

  function onMove(ev) {
    const dy = ev.clientY - startY
    // 每60px = 1小时
    const deltaH = Math.round(dy / 60)
    const newEnd = Math.max(item.startHour + 1, Math.min(config.workEndHour, item._origEndH + deltaH))
    item.endHour = newEnd
    item.endMinute = 0
  }

  async function onUp() {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    item._resizing = false
    if (item.endHour !== item._origEndH) {
      try {
        await put('/schedule/' + item.id, { endHour: item.endHour, endMinute: 0 })
        await loadItems()
      } catch (e) { toast.error(e.message) }
    }
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

// --- 数据加载 ---
async function loadItems() {
  const start = weekDays.value[0]?.date || ''
  const end = weekDays.value[6]?.date || ''
  try {
    allItems.value = await get('/schedule?start=' + start + '&end=' + end)
  } catch (e) { toast.error('加载计划失败') }
}

async function loadConfig() {
  try { Object.assign(config, await get('/config')) } catch {}
}

async function loadTasks() {
  try {
    const all = await get('/tasks')
    pendingTasks.value = all.filter(t => t.status !== 'done')
  } catch {}
}

async function saveConfig() {
  try {
    await put('/config', {
      workStartHour: config.workStartHour,
      workEndHour: config.workEndHour,
      restPeriods: config.restPeriods
    })
    showConfig.value = false
    toast.success('配置已保存')
  } catch (e) { toast.error(e.message) }
}

// --- 新增/编辑 ---
function openDayAdd(date, period) {
  let sh = 9, eh = 10
  if (period === 'am') { sh = 9; eh = 10 }
  else if (period === 'pm') { sh = 14; eh = 15 }
  else if (period === 'ev') { sh = 19; eh = 20 }
  editingItem.value = null
  Object.assign(form, { ...defaultForm, date, startHour: sh, endHour: eh })
  showModal.value = true
}

function openEdit(item) {
  editingItem.value = item
  Object.assign(form, {
    taskId: item.taskId || '',
    date: item.date, startHour: item.startHour, endHour: item.endHour,
    color: item.color || ''
  })
  loadTasks()
  showModal.value = true
}

function openAdd() {
  editingItem.value = null
  Object.assign(form, { ...defaultForm, date: new Date().toISOString().slice(0, 10) })
  showModal.value = true
}

function createTaskForSchedule() {
  openTaskCreate({
    onCreated: async (task) => {
      await loadTasks()
      form.taskId = task.id
    }
  })
}

async function saveItem() {
  if (!form.taskId) return toast.warning('请选择任务')
  if (form.endHour - form.startHour < 1) return toast.warning('计划时长至少1小时')
  const task = pendingTasks.value.find(t => t.id === form.taskId)
  const payload = {
    taskId: form.taskId,
    title: task?.title || '',
    date: form.date, startHour: form.startHour, endHour: form.endHour,
    startMinute: 0, endMinute: 0,
    color: form.color || null
  }
  try {
    if (editingItem.value) {
      await put('/schedule/' + editingItem.value.id, payload)
      toast.success('已更新')
    } else {
      await post('/schedule', payload)
      toast.success('已创建')
    }
    showModal.value = false
    await loadItems()
  } catch (e) { toast.error(e.message) }
}

async function deleteItem(item) {
  if (!await confirmDialog.value?.show('删除计划「' + item.title + '」？')) return
  try {
    await del('/schedule/' + item.id)
    await loadItems()
    toast.success('已删除')
  } catch (e) { toast.error(e.message) }
}

function fmtTime(h, m) {
  return String(h).padStart(2, '0') + ':' + String(m || 0).padStart(2, '0')
}

watch(weekOffset, loadItems)
watch(monthOffset, loadItems)

onMounted(async () => {
  await Promise.all([loadConfig(), loadItems(), loadTasks()])
  loading.value = false
})
</script>

<style scoped>
.view { flex: 1; display: flex; flex-direction: column; overflow: hidden; padding: var(--sp-5); animation: fadeIn 0.3s var(--ease-smooth); }
.view-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: var(--sp-3); flex-wrap: wrap; gap: var(--sp-3); flex-shrink: 0;
}
.view-title {
  font-family: var(--f-display); font-size: var(--fs-2xl);
  font-weight: var(--fw-bold); color: var(--c-text);
}
.toolbar-actions { display: flex; align-items: center; gap: var(--sp-2); }
.view-tabs { display: flex; background: var(--c-bg); border-radius: var(--radius-md); padding: 2px; border: 1px solid var(--c-border); }
.tab-btn {
  padding: var(--sp-1) var(--sp-3); border: none; border-radius: var(--radius-sm);
  background: transparent; color: var(--c-text-2); font-size: var(--fs-sm);
  font-family: var(--f-body); cursor: pointer; transition: all var(--t-fast);
}
.tab-btn.active { background: var(--c-surface); color: var(--c-primary); box-shadow: var(--shadow-sm); font-weight: var(--fw-semibold); }
.week-label { font-size: var(--fs-sm); color: var(--c-text-2); min-width: 180px; text-align: center; }

/* Week View */
.week-view { flex: 1; overflow: auto; display: flex; flex-direction: column; }
.week-grid { flex: 1; display: flex; flex-direction: column; }
.week-header { display: flex; flex-shrink: 0; border-bottom: 1px solid var(--c-border); position: sticky; top: 0; background: var(--c-bg); z-index: 2; pointer-events: none; }
.week-header > * { pointer-events: auto; }
.time-gutter { width: 52px; flex-shrink: 0; }
.day-header {
  flex: 1; text-align: center; padding: var(--sp-1) 0;
  font-size: var(--fs-sm); color: var(--c-text-2);
}
.day-header.today { color: var(--c-primary); font-weight: var(--fw-bold); }
.day-name { display: block; font-size: var(--fs-xs); }
.day-date { display: block; font-size: var(--fs-lg); }

.week-body { flex: 1; display: flex; overflow-y: auto; overflow-x: hidden; position: relative; }
.week-body .time-gutter { display: flex; flex-direction: column; padding-top: 0; }
.hour-label {
  height: 60px; display: flex; align-items: flex-start; justify-content: flex-end;
  padding-right: var(--sp-1); font-size: var(--fs-xs); color: var(--c-text-3);
}
.day-col {
  flex: 1; position: relative; border-left: 1px solid var(--c-border);
  overflow: hidden;
}
.day-col.today { background: var(--c-primary-soft); }
.hour-slot {
  height: 60px; box-shadow: inset 0 -1px 0 var(--c-border);
  transition: background var(--t-fast);
}
.hour-slot.drag-over {
  background: var(--c-blue);
  opacity: 0.25;
  position: relative; z-index: 5;
}


/* 休息时间背景色带 */
.rest-block {
  position: absolute; left: 0; right: 0;
  background: repeating-linear-gradient(
    -45deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 6px
  );
  pointer-events: none; z-index: 0;
}
.dark .rest-block {
  background: repeating-linear-gradient(
    -45deg, transparent, transparent 3px, rgba(255,255,255,0.06) 3px, rgba(255,255,255,0.06) 6px
  );
}

/* Schedule item on week view */
.schedule-item {
  position: absolute; left: 2px; right: 2px;
  border-radius: var(--radius-sm);
  background: var(--c-blue);
  color: #fff;
  padding: 2px var(--sp-1);
  font-size: var(--fs-xs);
  cursor: grab;
  overflow: hidden;
  z-index: 1;
  transition: box-shadow var(--t-fast);
  display: flex; flex-direction: column;
}
.schedule-item:hover { box-shadow: var(--shadow-md); z-index: 3; }
.schedule-item.has-task { background: var(--c-green); }
.si-time { font-weight: var(--fw-semibold); line-height: 1.2; }
.si-title { line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.si-resize {
  position: absolute; bottom: 0; left: 0; right: 0; height: 6px;
  cursor: ns-resize;
}
.si-delete {
  position: absolute; top: 0; right: 0;
  width: 18px; height: 18px; border: none; background: transparent;
  color: rgba(255,255,255,0.7); font-size: 14px; cursor: pointer;
  display: none; align-items: center; justify-content: center;
}
.schedule-item:hover .si-delete { display: flex; }

/* Month View */
.month-view { flex: 1; overflow: auto; }
.month-nav { display: flex; align-items: center; justify-content: center; gap: var(--sp-3); margin-bottom: var(--sp-3); }
.month-label { font-size: var(--fs-lg); font-weight: var(--fw-semibold); color: var(--c-text); min-width: 140px; text-align: center; }
.month-grid {
  display: grid; grid-template-columns: repeat(7, 1fr);
  border: 1px solid var(--c-border); border-radius: var(--radius-md); overflow: hidden;
}
.mday-header {
  text-align: center; padding: var(--sp-1); font-size: var(--fs-xs);
  color: var(--c-text-3); font-weight: var(--fw-semibold);
  border-bottom: 1px solid var(--c-border); background: var(--c-bg);
}
.mday-cell {
  min-height: 90px; border-right: 1px solid var(--c-border);
  border-bottom: 1px solid var(--c-border); padding: 2px;
  cursor: pointer; transition: background var(--t-fast);
  display: flex; flex-direction: column;
}
.mday-cell:nth-child(7n) { border-right: none; }
.mday-cell:hover { background: var(--c-primary-soft); }
.mday-cell.today { background: var(--c-primary-soft); }
.mday-cell.other { opacity: 0.4; }
.mday-num { font-size: var(--fs-xs); color: var(--c-text-2); font-weight: var(--fw-medium); margin-bottom: 1px; }
.mday-section {
  flex: 1; font-size: 10px; min-height: 20px;
  border-radius: 2px; padding: 2px; margin: 1px 0;
  cursor: pointer;
}
.mday-am { background: rgba(74,143,191,0.1); }
.mday-pm { background: rgba(217,79,59,0.08); }
.mday-ev { background: rgba(52,73,94,0.08); }
.mday-item {
  padding: 1px 2px; border-radius: 2px; margin-bottom: 1px;
  color: #fff; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; cursor: pointer;
  font-size: 10px; line-height: 1.3;
}
.mday-item:hover { opacity: 0.8; }

.color-picker { display: flex; gap: var(--sp-2); flex-wrap: wrap; }
.color-swatch {
  width: 28px; height: 28px; border-radius: var(--radius-sm);
  border: 3px solid transparent; cursor: pointer;
  transition: all var(--t-fast);
}
.color-swatch:hover { transform: scale(1.15); }
.color-swatch.active { border-color: var(--c-text); box-shadow: 0 0 0 2px var(--c-bg); }
.color-swatch.color-none {
  background: var(--c-bg); border: 2px dashed var(--c-border);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; color: var(--c-text-3);
}
</style>
