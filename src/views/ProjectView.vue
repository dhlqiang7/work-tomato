<template>
  <div class="view project-view">
    <div class="view-toolbar">
      <h2 class="view-title">项目</h2>
      <button class="btn btn-primary" @click="openCreate">＋ 新建项目</button>
    </div>

    <div class="project-grid" v-if="projects.length">
      <div v-for="(p, idx) in projects" :key="p.id" class="project-card card"
        :style="{ animationDelay: idx * 60 + 'ms', '--project-color': p.color || '#D94F3B' }">
        <div class="project-color-bar" :style="{ background: p.color || '#D94F3B' }"></div>
        <div class="project-header">
          <h3 class="project-name">{{ p.title }}</h3>
          <div class="project-menu">
            <button class="btn btn-sm btn-ghost" @click="openEdit(p)">✏️</button>
            <button v-if="p.id !== 'default'" class="btn btn-sm btn-ghost" @click="confirmDelete(p)">🗑️</button>
          </div>
        </div>
        <p v-if="p.description" class="project-desc">{{ p.description }}</p>
        <div class="project-stats">
          <div class="project-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: p.progress + '%', background: p.color || '#D94F3B' }"></div>
            </div>
            <span class="progress-text">{{ p.progress }}%</span>
          </div>
          <div class="project-count">{{ p.doneCount || 0 }} / {{ p.taskCount || 0 }} 任务</div>
        </div>
      </div>
    </div>
    <div v-else class="empty-state">
      <div class="icon">📁</div>
      <div class="title">暂无项目</div>
      <div class="desc">创建项目来组织你的任务</div>
    </div>

    <Modal v-model="showModal" :title="editing ? '编辑项目' : '新建项目'">
      <div class="form-group">
        <label class="form-label">项目标题 *</label>
        <input v-model="form.title" class="input" placeholder="输入项目标题" required />
      </div>
      <div class="form-group">
        <label class="form-label">描述</label>
        <textarea v-model="form.description" class="textarea" placeholder="项目描述（可选）"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">标识色</label>
        <div class="color-picker">
          <button v-for="c in colors" :key="c" class="color-swatch"
            :class="{ active: form.color === c }"
            :style="{ background: c }"
            @click="form.color = c" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">关联人员（逗号分隔）</label>
        <input v-model="peopleInput" class="input" placeholder="如：张三, 李四" />
      </div>
      <template #footer>
        <button class="btn" @click="showModal = false">取消</button>
        <button class="btn btn-primary" @click="save">{{ editing ? '保存' : '创建' }}</button>
      </template>
    </Modal>
    <ConfirmDialog ref="confirmDialog" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'
import Modal from '@/components/common/Modal.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

const { get, post, put, del } = useApi()
const toast = useToast()
const confirmDialog = ref(null)

const projects = ref([])
const showModal = ref(false)
const editing = ref(null)
const peopleInput = ref('')
const colors = ['#D94F3B', '#E8943A', '#5B8C5A', '#4A8FBF', '#9B59B6', '#1ABC9C', '#E67E22', '#34495E']
const defaultForm = { title: '', description: '', color: '#D94F3B', relatedPeople: [] }
const form = reactive({ ...defaultForm })

async function load() {
  projects.value = await get('/projects')
}

function openCreate() {
  editing.value = null
  Object.assign(form, defaultForm)
  peopleInput.value = ''
  showModal.value = true
}

function openEdit(p) {
  editing.value = p
  Object.assign(form, { title: p.title, description: p.description || '', color: p.color || '#D94F3B' })
  peopleInput.value = (p.relatedPeople || []).join(', ')
  showModal.value = true
}

async function save() {
  if (!form.title.trim()) return
  const payload = {
    ...form,
    relatedPeople: peopleInput.value ? peopleInput.value.split(/[,，]/).map(s => s.trim()).filter(Boolean) : []
  }
  try {
    if (editing.value) {
      await put(`/projects/${editing.value.id}`, payload)
      toast.success('项目已更新')
    } else {
      await post('/projects', payload)
      toast.success('项目已创建')
    }
    showModal.value = false
    await load()
  } catch (e) { toast.error(e.message) }
}

async function confirmDelete(p) {
  if (!await confirmDialog.value?.show(`确定删除「${p.title}」？该项目下任务将移至默认项目。`)) return
  try {
    await del(`/projects/${p.id}`)
    toast.success('已删除')
    await load()
  } catch (e) { toast.error(e.message) }
}

onMounted(load)
</script>

<style scoped>
.view { flex: 1; overflow-y: auto; padding: var(--sp-5); animation: fadeIn 0.3s var(--ease-smooth); }
.view-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--sp-5); }
.view-title {
  font-family: var(--f-display); font-size: var(--fs-2xl);
  font-weight: var(--fw-bold); color: var(--c-text); letter-spacing: -0.01em;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--sp-4);
}
.project-card {
  padding: 0;
  overflow: hidden;
  animation: slideUp 0.35s var(--ease-smooth) both;
  position: relative;
}
.project-color-bar { height: 4px; }
.project-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: var(--sp-4) var(--sp-4) 0;
}
.project-name {
  font-family: var(--f-display);
  font-size: var(--fs-lg);
  font-weight: var(--fw-semibold);
}
.project-menu { display: flex; gap: 2px; opacity: 0; transition: opacity var(--t-fast); }
.project-card:hover .project-menu { opacity: 1; }
.project-desc {
  padding: var(--sp-2) var(--sp-4) 0;
  font-size: var(--fs-sm);
  color: var(--c-text-2);
  line-height: var(--lh-relaxed);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.project-stats { padding: var(--sp-3) var(--sp-4) var(--sp-4); }
.project-progress {
  display: flex; align-items: center; gap: var(--sp-2);
  margin-bottom: var(--sp-1);
}
.progress-bar {
  flex: 1; height: 6px;
  background: var(--c-border);
  border-radius: 3px;
  overflow: hidden;
}
.progress-fill {
  height: 100%; border-radius: 3px;
  transition: width 0.5s var(--ease-smooth);
}
.progress-text {
  font-size: var(--fs-xs);
  font-family: var(--f-mono);
  color: var(--c-text-2);
  min-width: 36px;
}
.project-count {
  font-size: var(--fs-xs);
  color: var(--c-text-3);
}

.color-picker {
  display: flex; gap: var(--sp-2); flex-wrap: wrap;
}
.color-swatch {
  width: 32px; height: 32px;
  border-radius: var(--radius-md);
  border: 3px solid transparent;
  cursor: pointer;
  transition: all var(--t-fast) var(--ease-spring);
}
.color-swatch:hover { transform: scale(1.15); }
.color-swatch.active {
  border-color: var(--c-text);
  box-shadow: 0 0 0 2px var(--c-bg);
}
</style>
