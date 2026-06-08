<template>
  <div class="view note-view">
    <!-- 顶部工具栏 -->
    <div class="view-toolbar">
      <h2 class="view-title">笔记</h2>
      <div class="toolbar-actions">
        <select class="select theme-select" v-model="mdTheme">
          <option value="default">暖色主题</option>
          <option value="classic">GitHub 风格</option>
          <option value="minimal">极简黑白</option>
          <option value="dark-prose">深色阅读</option>
        </select>
        <button class="btn" @click="createNote">＋ 新建笔记</button>
      </div>
    </div>

    <!-- 分类标签栏 -->
    <div class="category-bar">
      <button
        class="cat-tag"
        :class="{ active: activeCat === '' }"
        @click="activeCat = ''"
      >全部</button>
      <button
        v-for="cat in categories"
        :key="cat.id"
        class="cat-tag"
        :class="{ active: activeCat === cat.id }"
        :style="{ borderColor: cat.color }"
        @click="activeCat = cat.id"
        @contextmenu.prevent="onCatContextMenu(cat, $event)"
      >{{ cat.title }}</button>
      <button class="cat-tag cat-add" @click="addCategory">＋</button>
    </div>

    <!-- 主体：笔记列表 + 编辑/预览 -->
    <div class="note-main" v-if="!loading">
      <!-- 左侧：笔记列表 -->
      <div class="note-list">
        <div v-if="filteredNotes.length === 0" class="note-list-empty">
          暂无笔记，点击「＋ 新建笔记」开始
        </div>
        <div
          v-for="note in filteredNotes"
          :key="note.id"
          class="note-card"
          :class="{ active: editingId === note.id, pinned: note.pinned }"
          @click="selectNote(note)"
        >
          <div class="note-card-title">{{ note.title || '未命名笔记' }}</div>
          <div class="note-card-meta">
            <span class="note-card-date">{{ fmtDate(note.updatedAt) }}</span>
            <span v-if="note.linkedTaskIds?.length" class="note-card-link">🔗 {{ note.linkedTaskIds.length }}</span>
            <span v-if="note.pinned" class="note-card-pin">📌</span>
          </div>
          <div class="note-card-preview">{{ note.content?.slice(0, 80) || '' }}</div>
        </div>
      </div>

      <!-- 右侧：编辑器/预览 -->
      <div class="note-editor" v-if="currentNote">
        <div class="note-editor-header">
          <input
            v-model="currentNote.title"
            class="note-title-input"
            placeholder="笔记标题"
            @input="onTitleChange"
          />
          <div class="note-editor-actions">
            <button
              v-if="readMode"
              class="btn btn-sm btn-ghost" title="编辑"
              @click="readMode = false"
            >✏️</button>
            <button
              v-else
              class="btn btn-sm btn-ghost" title="阅读模式"
              @click="readMode = true"
            >👁</button>
            <button class="btn btn-sm btn-ghost" :class="{ active: currentNote.pinned }"
              title="置顶" @click="togglePin">📌</button>
            <button class="btn btn-sm btn-ghost" @click="showLinkTasks = true" title="关联任务">🔗</button>
            <button v-if="!readMode" class="btn btn-sm btn-ghost" title="格式化" @click="formatMarkdown">¶</button>
            <button v-if="!readMode" class="btn btn-sm btn-ghost" :class="{ active: showWhitespace }"
              title="显示空白字符" @click="showWhitespace = !showWhitespace">·</button>
            <button class="btn btn-sm btn-ghost" @click="deleteCurrent" title="删除">🗑</button>
          </div>
        </div>

        <!-- 关联任务标签 -->
        <div v-if="linkedTasks.length" class="note-linked-tasks">
          <span class="linked-label">关联任务：</span>
          <span
            v-for="t in linkedTasks"
            :key="t.id"
            class="linked-task-badge"
            @click="goToTask(t.id)"
          >🔗 {{ t.title }}</span>
        </div>

        <!-- 编辑模式 -->
        <div v-if="!readMode" class="edit-split">
          <div class="editor-wrapper" :class="{ 'show-ws': showWhitespace }">
            <pre v-if="showWhitespace" class="whitespace-backdrop" aria-hidden="true"
              ref="wsBackdrop"><code v-html="whitespaceContent"></code><br></pre>
            <textarea
              ref="textareaEl"
              v-model="currentNote.content"
              class="note-textarea"
              :class="{ 'text-transparent': showWhitespace }"
              placeholder="支持 Markdown 和 Mermaid 语法..."
              @input="onContentChange"
              @scroll="onTextareaScroll"
            ></textarea>
          </div>
          <div class="note-preview-pane">
            <MarkdownViewer :content="currentNote.content" :theme="mdTheme" />
          </div>
        </div>

        <!-- 阅读模式 -->
        <div v-else class="read-full">
          <MarkdownViewer :content="currentNote.content" :theme="mdTheme" />
        </div>
      </div>

      <div class="note-editor empty-hint" v-else>
        选择左侧笔记开始编辑
      </div>
    </div>

    <div v-else class="loading-state">加载中...</div>

    <!-- 分类输入弹窗 -->
    <Modal v-model="showCatInput" :title="catInputAction === 'add' ? '新建分类' : '编辑分类'" width="360px">
      <div class="form-group">
        <input v-model="catInputTitle" class="input" placeholder="输入分类名称" @keyup.enter="confirmCatInput" />
      </div>
      <template #footer>
        <button class="btn" @click="showCatInput = false">取消</button>
        <button class="btn btn-primary" @click="confirmCatInput">确定</button>
      </template>
    </Modal>

    <!-- 关联任务弹窗 -->
    <Modal v-model="showLinkTasks" title="关联任务" width="480px">
      <div class="form-group">
        <label class="form-label">搜索并选择要关联的任务</label>
        <input v-model="taskSearch" class="input" placeholder="输入任务标题搜索..." />
        <div class="task-checkboxes" v-if="allTasks.length">
          <label
            v-for="t in filteredTasks"
            :key="t.id"
            class="task-check-item"
          >
            <input type="checkbox" :value="t.id" v-model="linkTaskIds" />
            <span>{{ t.priority }} | {{ t.title }}</span>
          </label>
        </div>
        <div v-else class="text-muted" style="font-size:var(--fs-sm);padding:var(--sp-2) 0">无可用任务</div>
      </div>
      <template #footer>
        <button class="btn" @click="showLinkTasks = false">取消</button>
        <button class="btn btn-primary" @click="saveLinkTasks">确定</button>
      </template>
    </Modal>

    <ConfirmDialog ref="confirmDialog" />
    <ContextMenu ref="ctxMenu" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, inject, nextTick } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'
import Modal from '@/components/common/Modal.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import ContextMenu from '@/components/common/ContextMenu.vue'
import MarkdownViewer from '@/components/common/MarkdownViewer.vue'

const { get, post, put, del } = useApi()
const toast = useToast()
const navigateToNote = inject('navigateToNote', null)
const confirmDialog = ref(null)
const ctxMenu = ref(null)

const loading = ref(true)
const activeCat = ref('')
const categories = ref([])
const notes = ref([])
const editingId = ref(null)
const currentNote = ref(null)
const readMode = ref(false)
const allTasks = ref([])
const showLinkTasks = ref(false)
const taskSearch = ref('')
const linkTaskIds = ref([])
const showCatInput = ref(false)
const catInputTitle = ref('')
const catInputAction = ref('add')
const catInputTarget = ref(null)
// Markdown 主题（localStorage 持久化）
const mdTheme = ref(localStorage.getItem('mdTheme') || 'default')
const showWhitespace = ref(false)
const textareaEl = ref(null)
const wsBackdrop = ref(null)

let saveTimer = null

// 主题变化时自动持久化
watch(mdTheme, (v) => { localStorage.setItem('mdTheme', v) })

const filteredNotes = computed(() => {
  let list = notes.value
  if (activeCat.value) {
    list = list.filter(n => n.categoryId === activeCat.value)
  }
  // 排序：置顶优先，然后按标题字典序
  list = [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    const ta = (a.title || '').toLowerCase()
    const tb = (b.title || '').toLowerCase()
    return ta.localeCompare(tb, 'zh-CN')
  })
  return list
})

const linkedTasks = computed(() => {
  if (!currentNote.value?.linkedTaskIds?.length) return []
  return allTasks.value.filter(t => currentNote.value.linkedTaskIds.includes(t.id))
})

const filteredTasks = computed(() => {
  if (!taskSearch.value) return allTasks.value
  const kw = taskSearch.value.toLowerCase()
  return allTasks.value.filter(t => t.title.toLowerCase().includes(kw))
})

// 空白字符可视化：将空格渲染为 ·，tab 渲染为 →\x20\x20\x20
const whitespaceContent = computed(() => {
  const text = currentNote.value?.content || ''
  return escapeHtmlWS(text)
})

function escapeHtmlWS(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\t/g, '<span class="ws-tab">→\x20\x20\x20</span>')
    .replace(/ /g, '<span class="ws-space">·</span>')
}

function onTextareaScroll() {
  if (wsBackdrop.value) {
    wsBackdrop.value.scrollTop = textareaEl.value?.scrollTop || 0
    wsBackdrop.value.scrollLeft = textareaEl.value?.scrollLeft || 0
  }
}

// Markdown 自动格式化
function formatMarkdown() {
  if (!currentNote.value) return
  let text = currentNote.value.content || ''

  // 1. Tab → 4 空格
  text = text.replace(/\t/g, '\x20\x20\x20\x20')

  // 2. 去除行尾空白
  text = text.replace(/[ \t]+$/gm, '')

  // 3. 统一无序列表符号为 -
  text = text.replace(/^(\s*)[*+]\s/gm, '$1- ')

  // 4. 标题前后确保空行
  text = text.replace(/([^\n])\n(#{1,6}\s)/g, '$1\n\n$2')
  text = text.replace(/(#{1,6}\s[^\n]+)\n([^\n#])/g, '$1\n\n$2')

  // 5. 代码块前后确保空行
  text = text.replace(/([^\n])\n(```)/g, '$1\n\n$2')
  text = text.replace(/(```)\n([^\n`])/g, '$1\n\n$2')

  // 6. 水平线前后确保空行
  text = text.replace(/([^\n])\n(---)/g, '$1\n\n$2')
  text = text.replace(/(---)\n([^\n])/g, '$1\n\n$2')

  // 7. 确保文件末尾一个换行
  text = text.replace(/\n*$/, '\n')

  // 8. 合并多个连续空行为双空行
  text = text.replace(/\n{3,}/g, '\n\n')

  currentNote.value.content = text
  onContentChange()
}

async function loadCategories() {
  try { categories.value = await get('/note-categories') } catch {}
}

async function loadNotes() {
  try { notes.value = await get('/notes') } catch {}
}

async function loadTasks() {
  try { allTasks.value = await get('/tasks') } catch {}
}

async function load() {
  loading.value = true
  await Promise.all([loadCategories(), loadNotes(), loadTasks()])
  loading.value = false
}

// 切换分类时，如果当前笔记不在新分类中，自动选第一篇
watch(activeCat, async () => {
  if (loading.value) return
  await nextTick()
  const list = filteredNotes.value
  if (!list.length) {
    currentNote.value = null
    editingId.value = null
    return
  }
  if (currentNote.value && list.find(n => n.id === currentNote.value.id)) return
  selectNote(list[0])
})

function createNote() {
  currentNote.value = {
    id: null, title: '', content: '',
    categoryId: activeCat.value || null,
    linkedTaskIds: [], pinned: false
  }
  editingId.value = null
  readMode.value = false
}

async function selectNote(note) {
  if (editingId.value === note.id) return
  // 保存正在编辑的笔记
  await saveCurrent()
  editingId.value = note.id
  currentNote.value = { ...note }
  readMode.value = false
}

function onTitleChange() {
  scheduleSave()
}

function onContentChange() {
  scheduleSave()
}

function scheduleSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => saveCurrent(), 800)
}

async function saveCurrent() {
  if (!currentNote.value) return
  const n = currentNote.value
  if (!n.title && !n.content && !n.id) return
  try {
    if (n.id) {
      await put('/notes/' + n.id, {
        title: n.title, content: n.content,
        categoryId: n.categoryId, linkedTaskIds: n.linkedTaskIds, pinned: n.pinned
      })
    } else {
      const created = await post('/notes', {
        title: n.title, content: n.content,
        categoryId: n.categoryId, linkedTaskIds: n.linkedTaskIds
      })
      n.id = created.id
      editingId.value = created.id
    }
    await loadNotes()
  } catch (e) { /* 静默保存失败 */ }
}

async function togglePin() {
  currentNote.value.pinned = !currentNote.value.pinned
  await saveCurrent()
}

async function deleteCurrent() {
  if (!currentNote.value?.id) { currentNote.value = null; editingId.value = null; return }
  if (!await confirmDialog.value?.show(`删除笔记「${currentNote.value.title || '未命名'}」？`)) return
  try {
    await del('/notes/' + currentNote.value.id)
    currentNote.value = null
    editingId.value = null
    await loadNotes()
    toast.success('已删除')
  } catch (e) { toast.error(e.message) }
}

// 分类操作
function addCategory() {
  catInputAction.value = 'add'
  catInputTitle.value = ''
  catInputTarget.value = null
  showCatInput.value = true
}

async function confirmCatInput() {
  const title = catInputTitle.value.trim()
  if (!title) return
  showCatInput.value = false
  try {
    if (catInputAction.value === 'add') {
      await post('/note-categories', { title })
    } else if (catInputTarget.value) {
      await put('/note-categories/' + catInputTarget.value.id, { title })
    }
    await loadCategories()
  } catch (e) { toast.error(e.message) }
}

async function onCatContextMenu(cat, event) {
  const action = await ctxMenu.value?.show([
    { label: '编辑', icon: '✏️', action: 'edit' },
    { label: '删除', icon: '🗑️', action: 'delete', danger: true },
  ], event)
  if (action === 'edit') {
    catInputAction.value = 'edit'
    catInputTitle.value = cat.title
    catInputTarget.value = cat
    showCatInput.value = true
  } else if (action === 'delete') {
    if (!await confirmDialog.value?.show(`删除分类「${cat.title}」？笔记将归为"全部"。`)) return
    await del('/note-categories/' + cat.id)
    if (activeCat.value === cat.id) activeCat.value = ''
    await loadCategories()
    await loadNotes()
  }
}

// 关联任务
async function saveLinkTasks() {
  currentNote.value.linkedTaskIds = [...linkTaskIds.value]
  // 同步更新关联任务的 noteId
  for (const t of allTasks.value) {
    if (linkTaskIds.value.includes(t.id)) {
      if (t.noteId !== currentNote.value.id) await put('/tasks/' + t.id, { noteId: currentNote.value.id })
    } else if (t.noteId === currentNote.value.id) {
      await put('/tasks/' + t.id, { noteId: null })
    }
  }
  showLinkTasks.value = false
  await saveCurrent()
  toast.success('关联已更新')
}

function goToTask(taskId) {
  // 通过 inject 的函数跳转到任务页
  // 这里需要 emit 到 App 层切换视图
}

function fmtDate(d) {
  if (!d) return ''
  const date = new Date(d)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  return `${date.getMonth() + 1}/${date.getDate()}`
}

// 从外部跳转到指定笔记（App.vue 通过 ref 调用）
function openNote(noteId) {
  const note = notes.value.find(n => n.id === noteId)
  if (!note) return
  selectNote(note)
}

defineExpose({ load, openNote })

onMounted(load)
</script>

<style scoped>
.view { flex: 1; display: flex; flex-direction: column; overflow: hidden; padding: var(--sp-5); animation: fadeIn 0.3s var(--ease-smooth); }
.view-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: var(--sp-2); flex-shrink: 0;
}
.view-title {
  font-family: var(--f-display); font-size: var(--fs-2xl);
  font-weight: var(--fw-bold); color: var(--c-text);
}
.toolbar-actions { display: flex; align-items: center; gap: var(--sp-2); }

/* 分类标签 */
.category-bar {
  display: flex; align-items: center; gap: var(--sp-1);
  flex-shrink: 0; overflow-x: auto; padding-bottom: var(--sp-2);
  border-bottom: 1px solid var(--c-border); margin-bottom: var(--sp-2);
}
.cat-tag {
  padding: 4px 14px; border: 2px solid transparent; border-radius: var(--radius-full);
  background: transparent; color: var(--c-text-2); font-size: var(--fs-sm);
  font-family: var(--f-body); cursor: pointer;
  transition: all var(--t-fast); white-space: nowrap; flex-shrink: 0;
}
.cat-tag:hover { background: var(--c-bg); color: var(--c-text); }
.cat-tag.active {
  background: var(--c-surface); color: var(--c-text);
  font-weight: var(--fw-semibold); box-shadow: var(--shadow-sm);
  border-color: var(--c-primary);
}
.cat-add {
  border: 2px dashed var(--c-border); color: var(--c-text-3);
  padding: 4px 10px; font-size: var(--fs-md);
}
.cat-add:hover { border-color: var(--c-text-3); }

/* 主体两栏 */
.note-main { flex: 1; display: flex; overflow: hidden; gap: 1px; background: var(--c-border); }

/* 笔记列表 */
.note-list {
  width: 260px; flex-shrink: 0; overflow-y: auto;
  background: var(--c-bg); padding: var(--sp-2);
  display: flex; flex-direction: column; gap: var(--sp-1);
}
.note-list-empty {
  text-align: center; padding: var(--sp-6) var(--sp-3);
  color: var(--c-text-3); font-size: var(--fs-sm);
}
.note-card {
  padding: var(--sp-2) var(--sp-3); border-radius: var(--radius-md);
  cursor: pointer; transition: all var(--t-fast);
  border: 1px solid transparent;
}
.note-card:hover { background: var(--c-surface); }
.note-card.active {
  background: var(--c-surface); border-color: var(--c-primary);
  box-shadow: var(--shadow-sm);
}
.note-card-title {
  font-weight: var(--fw-medium); font-size: var(--fs-sm);
  color: var(--c-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.note-card-meta {
  display: flex; gap: var(--sp-1); font-size: 11px;
  color: var(--c-text-3); margin-top: 2px;
}
.note-card-link { color: var(--c-blue); }
.note-card-pin { font-size: 10px; }
.note-card-preview {
  font-size: 11px; color: var(--c-text-3);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px;
}
.note-card.pinned { border-left: 3px solid var(--c-orange, #E8943A); }

/* 编辑器 */
.note-editor {
  flex: 1; display: flex; flex-direction: column;
  background: var(--c-card); overflow: hidden;
}
.note-editor.empty-hint {
  flex: 1; display: flex; align-items: center; justify-content: center;
  color: var(--c-text-3); font-size: var(--fs-sm);
}
.note-editor-header {
  display: flex; align-items: center; gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3); border-bottom: 1px solid var(--c-border);
  flex-shrink: 0;
}
.note-title-input {
  flex: 1; border: none; outline: none;
  font-size: var(--fs-lg); font-weight: var(--fw-semibold);
  font-family: var(--f-display); color: var(--c-text);
  background: transparent; padding: var(--sp-1) 0;
}
.note-editor-actions { display: flex; gap: 2px; flex-shrink: 0; }
.note-editor-actions .btn-sm.active { color: var(--c-orange, #E8943A); }

/* 关联任务 */
.note-linked-tasks {
  display: flex; align-items: center; gap: var(--sp-1);
  padding: var(--sp-1) var(--sp-3); border-bottom: 1px solid var(--c-border);
  flex-wrap: wrap; flex-shrink: 0;
}
.linked-label { font-size: var(--fs-xs); color: var(--c-text-3); }
.linked-task-badge {
  font-size: var(--fs-xs); color: var(--c-blue); cursor: pointer;
  padding: 1px 6px; border-radius: var(--radius-full);
  background: var(--c-blue-soft);
}
.linked-task-badge:hover { text-decoration: underline; }

/* 编辑分屏 */
.edit-split {
  flex: 1; display: flex; overflow: hidden;
}
.note-textarea {
  width: 50%; border: none; border-right: 1px solid var(--c-border); outline: none;
  resize: none; padding: var(--sp-3); font-family: var(--f-mono);
  font-size: var(--fs-sm); line-height: var(--lh-relaxed);
  color: var(--c-text); background: transparent;
}
.note-preview-pane {
  width: 50%; padding: var(--sp-3); overflow-y: auto;
}

/* 阅读模式 */
.read-full {
  flex: 1; overflow-y: auto; padding: var(--sp-4) var(--sp-5);
}

/* 任务复选框 */
.task-checkboxes {
  max-height: 260px; overflow-y: auto;
  display: flex; flex-direction: column; gap: 4px;
  margin-top: var(--sp-2);
}
.task-check-item {
  display: flex; align-items: center; gap: var(--sp-2);
  font-size: var(--fs-sm); cursor: pointer; padding: var(--sp-1) 0;
}
.task-check-item input { accent-color: var(--c-primary); }

.text-muted { color: var(--c-text-3); }

/* 主题选择器 */
.theme-select {
  width: auto; min-width: 110px; height: 32px;
  font-size: var(--fs-xs); padding: 0 28px 0 10px;
  background-position: right 8px center;
}

/* 编辑器空白字符可视化 */
.editor-wrapper {
  position: relative; width: 50%; border-right: 1px solid var(--c-border);
}
.whitespace-backdrop {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  margin: 0; padding: var(--sp-3);
  font-family: var(--f-mono); font-size: var(--fs-sm);
  line-height: var(--lh-relaxed); color: var(--c-text);
  overflow: hidden; pointer-events: none;
  white-space: pre-wrap; word-wrap: break-word;
  background: transparent;
}
.whitespace-backdrop code {
  font-family: inherit; font-size: inherit; line-height: inherit;
  background: none; padding: 0; border: none;
}
.ws-space { color: var(--c-border-2); }
.ws-tab { color: var(--c-text-3); font-size: 0.85em; }
.note-textarea.text-transparent {
  color: transparent; caret-color: var(--c-primary);
}
/* 空白字符模式下的 textarea 调整 */
.editor-wrapper.show-ws .note-textarea {
  width: 100%; border-right: none;
  position: relative; z-index: 1;
  background: transparent;
}
</style>
