<template>
  <Modal v-model="show" :title="editing ? '编辑任务' : '新建任务'">
    <form @submit.prevent="save">
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
        <textarea v-model="form.background" class="textarea" placeholder="如：使用 Claude Code / IDEA 开发" style="min-height:50px"></textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">所属项目</label>
          <select v-model="form.projectId" class="select">
            <option value="default">日常工作</option>
            <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.title }}</option>
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
      <button class="btn" @click="show = false">取消</button>
      <button class="btn btn-primary" @click="save">{{ editing ? '保存' : '创建' }}</button>
    </template>
  </Modal>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'
import Modal from '@/components/common/Modal.vue'

const { get, post, put } = useApi()
const toast = useToast()

const show = ref(false)
const editing = ref(false)
const tagsInput = ref('')
const peopleInput = ref('')
const projects = ref([])
const onCreated = ref(null)
const onUpdated = ref(null)
let editingId = null

const defaultForm = {
  title: '', description: '', projectId: 'default',
  priority: 'P2', deadline: '', estimatedPomodoros: 0,
  tags: [], relatedPeople: [], background: ''
}
const form = reactive({ ...defaultForm })

function open(opts = {}) {
  editingId = null
  editing.value = false
  onCreated.value = opts.onCreated || null
  onUpdated.value = opts.onUpdated || null
  tagsInput.value = ''
  peopleInput.value = ''

  if (opts.task) {
    editing.value = true
    editingId = opts.task.id
    const t = opts.task
    Object.assign(form, {
      title: t.title || '',
      description: t.description || '',
      projectId: t.projectId || 'default',
      priority: t.priority || 'P2',
      deadline: t.deadline ? t.deadline.slice(0, 16) : '',
      estimatedPomodoros: t.estimatedPomodoros || 0,
      background: t.background || '',
    })
    tagsInput.value = (t.tags || []).join(', ')
    peopleInput.value = (t.relatedPeople || []).join(', ')
  } else {
    Object.assign(form, { ...defaultForm })
  }

  loadProjects()
  show.value = true
}

async function loadProjects() {
  try {
    const all = await get('/projects')
    projects.value = all.filter(p => p.id !== 'default')
  } catch {}
}

async function save() {
  if (!form.title.trim()) return
  if (!['P0', 'P1', 'P2', 'P3'].includes(form.priority)) form.priority = 'P2'
  if (typeof form.estimatedPomodoros !== 'number' || form.estimatedPomodoros < 0) form.estimatedPomodoros = 0
  if (form.estimatedPomodoros > 20) form.estimatedPomodoros = 20

  const payload = {
    ...form,
    deadline: form.deadline || null,
    tags: tagsInput.value ? tagsInput.value.split(/[,，]/).map(s => s.trim()).filter(Boolean) : [],
    relatedPeople: peopleInput.value ? peopleInput.value.split(/[,，]/).map(s => s.trim()).filter(Boolean) : [],
  }

  try {
    let result
    if (editing.value) {
      result = await put(`/tasks/${editingId}`, payload)
      toast.success('任务已更新')
      onUpdated.value?.(result)
    } else {
      result = await post('/tasks', payload)
      toast.success('任务已创建')
      onCreated.value?.(result)
    }
    show.value = false
  } catch (e) {
    toast.error(e.message)
  }
}

defineExpose({ open })
</script>
