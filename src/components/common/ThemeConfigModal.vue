<template>
  <Modal v-model="show" title="主题配置" width="760px" :z-index="10000">
    <div class="theme-config">
      <!-- 预设主题 -->
      <div class="section-label">预设主题</div>
      <div class="preset-grid">
        <div
          v-for="p in presets" :key="p.id"
          class="theme-card"
          :class="{ active: activeThemeId === p.id }"
        >
          <div class="theme-card-preview" :class="'md-theme-' + p.id">
            <div class="preview-content markdown-body">
              <div class="preview-h2">标题文本</div>
              <div class="preview-p">正文段落，<span class="preview-code">code</span> 和 <strong>加粗</strong></div>
              <div class="preview-bq">引用文字</div>
            </div>
          </div>
          <div class="theme-card-info">
            <span class="theme-card-name">{{ p.name }}</span>
            <div class="theme-card-actions">
              <button class="btn btn-sm" @click="$emit('select', p.id)">使用</button>
              <button class="btn btn-sm btn-ghost" @click="copyPreset(p)">复制自定义</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 我的主题 -->
      <div class="section-header">
        <span class="section-label">我的主题</span>
        <button class="btn btn-sm btn-ghost" @click="createBlank">＋ 新建主题</button>
      </div>
      <div v-if="customThemes.length" class="custom-grid">
        <div
          v-for="t in customThemes" :key="t.id"
          class="theme-card"
          :class="{ active: activeThemeId === t.id }"
        >
          <div class="theme-card-preview custom-preview">
            <div class="preview-content" :style="previewStyle(t.props)">
              <div class="preview-h2">标题文本</div>
              <div class="preview-p">正文段落，<span class="preview-code" :style="codeStyle(t.props)">code</span> 和 <strong :style="{ color: t.props.strongColor || '' }">加粗</strong></div>
              <div class="preview-bq" :style="bqStyle(t.props)">引用文字</div>
            </div>
          </div>
          <div class="theme-card-info">
            <span class="theme-card-name">{{ t.name }}</span>
            <div class="theme-card-actions">
              <button class="btn btn-sm" @click="$emit('select', t.id)">使用</button>
              <button class="btn btn-sm btn-ghost" @click="editTheme(t)">编辑</button>
              <button class="btn btn-sm btn-ghost text-danger" @click="deleteTheme(t)">删除</button>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="empty-hint">暂无自定义主题，可从预设主题复制或新建</div>

      <!-- 编辑区 -->
      <div v-if="editing" class="edit-section">
        <div class="edit-section-header">
          <span>编辑主题</span>
          <span class="edit-base" v-if="editing.basePreset">基于: {{ presetName(editing.basePreset) }}</span>
        </div>
        <div class="edit-form">
          <div class="form-row">
            <label>主题名称</label>
            <input class="input" v-model="editing.name" placeholder="输入主题名称" />
          </div>

          <div class="prop-group">
            <div class="prop-group-title">字体</div>
            <div class="form-row compact">
              <label>字体族</label>
              <input class="input" v-model="editing.props.fontFamily" placeholder="如: Georgia, serif" />
            </div>
            <div class="form-row compact">
              <label>字号</label>
              <input class="input short" v-model="editing.props.fontSize" placeholder="15px" />
            </div>
            <div class="form-row compact">
              <label>行高</label>
              <input class="input short" v-model="editing.props.lineHeight" placeholder="1.7" />
            </div>
            <div class="form-row compact">
              <label>文字颜色</label>
              <input type="color" v-model="editing.props.textColor" />
              <input class="input short" v-model="editing.props.textColor" />
            </div>
          </div>

          <div class="prop-group">
            <div class="prop-group-title">标题</div>
            <div class="form-row compact">
              <label>标题颜色</label>
              <input type="color" v-model="editing.props.hColor" />
              <input class="input short" v-model="editing.props.hColor" />
            </div>
            <div class="form-row compact">
              <label>标题字体</label>
              <input class="input" v-model="editing.props.hFontFamily" placeholder="继承正文字体" />
            </div>
            <div class="form-row compact">
              <label>H1 大小</label>
              <input class="input short" v-model="editing.props.h1Size" placeholder="1.6em" />
            </div>
            <div class="form-row compact">
              <label>H2 大小</label>
              <input class="input short" v-model="editing.props.h2Size" placeholder="1.35em" />
            </div>
            <div class="form-row compact">
              <label>H1 底线</label>
              <input class="input" v-model="editing.props.h1BorderBottom" placeholder="2px solid #ddd" />
            </div>
            <div class="form-row compact">
              <label>H2 底线</label>
              <input class="input" v-model="editing.props.h2BorderBottom" placeholder="1px solid #ddd" />
            </div>
          </div>

          <div class="prop-group">
            <div class="prop-group-title">行内代码</div>
            <div class="form-row compact">
              <label>背景</label>
              <input type="color" v-model="editing.props.codeBg" />
              <input class="input short" v-model="editing.props.codeBg" />
            </div>
            <div class="form-row compact">
              <label>颜色</label>
              <input type="color" v-model="editing.props.codeColor" />
              <input class="input short" v-model="editing.props.codeColor" />
            </div>
          </div>

          <div class="prop-group">
            <div class="prop-group-title">代码块</div>
            <div class="form-row compact">
              <label>背景</label>
              <input type="color" v-model="editing.props.preBg" />
              <input class="input short" v-model="editing.props.preBg" />
            </div>
            <div class="form-row compact">
              <label>边框</label>
              <input class="input" v-model="editing.props.preBorder" placeholder="1px solid #ddd" />
            </div>
            <div class="form-row compact">
              <label>文字颜色</label>
              <input type="color" v-model="editing.props.preCodeColor" />
              <input class="input short" v-model="editing.props.preCodeColor" />
            </div>
          </div>

          <div class="prop-group">
            <div class="prop-group-title">引用</div>
            <div class="form-row compact">
              <label>左边框</label>
              <input class="input" v-model="editing.props.bqBorder" placeholder="3px solid #888" />
            </div>
            <div class="form-row compact">
              <label>颜色</label>
              <input type="color" v-model="editing.props.bqColor" />
              <input class="input short" v-model="editing.props.bqColor" />
            </div>
            <div class="form-row compact">
              <label>背景</label>
              <input class="input" v-model="editing.props.bqBg" placeholder="transparent" />
            </div>
          </div>

          <div class="prop-group">
            <div class="prop-group-title">其他</div>
            <div class="form-row compact">
              <label>表头背景</label>
              <input type="color" v-model="editing.props.thBg" />
              <input class="input short" v-model="editing.props.thBg" />
            </div>
            <div class="form-row compact">
              <label>链接颜色</label>
              <input type="color" v-model="editing.props.linkColor" />
              <input class="input short" v-model="editing.props.linkColor" />
            </div>
            <div class="form-row compact">
              <label>加粗颜色</label>
              <input type="color" v-model="editing.props.strongColor" />
              <input class="input short" v-model="editing.props.strongColor" />
            </div>
            <div class="form-row compact">
              <label>分隔线</label>
              <input class="input" v-model="editing.props.hrColor" placeholder="1px solid #ddd" />
            </div>
          </div>
        </div>

        <div class="edit-actions">
          <button class="btn btn-ghost" @click="editing = null">取消</button>
          <button v-if="editing.basePreset" class="btn btn-ghost" @click="resetToPreset">重置为预设</button>
          <button class="btn" @click="saveEditing">保存主题</button>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup>
import { ref, computed } from 'vue'
import Modal from './Modal.vue'

const props = defineProps({
  modelValue: Boolean,
  activeTheme: { type: String, default: 'default' }
})
const emit = defineEmits(['update:modelValue', 'select'])

const show = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})
const activeThemeId = computed(() => props.activeTheme)

// ── 预设主题数据 ──
const presets = [
  {
    id: 'default', name: '暖色工作室',
    props: {
      fontFamily: '', fontSize: '', lineHeight: '', textColor: '',
      hColor: '', hFontFamily: 'var(--f-display)',
      h1Size: '', h2Size: '',
      h1BorderBottom: '2px solid var(--c-border)',
      h2BorderBottom: '1px solid var(--c-border)',
      codeBg: 'var(--c-bg)', codeColor: 'var(--c-primary)',
      preBg: 'var(--c-bg)', preBorder: '1px solid var(--c-border)', preCodeColor: '',
      bqBorder: '3px solid var(--c-blue)', bqColor: 'var(--c-text-2)', bqBg: 'var(--c-bg)',
      thBg: 'var(--c-bg)', linkColor: 'var(--c-blue)',
      strongColor: '', hrColor: ''
    }
  },
  {
    id: 'classic', name: 'GitHub 风格',
    props: {
      fontFamily: "-apple-system, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
      fontSize: '15px', lineHeight: '1.65', textColor: '',
      hColor: '', hFontFamily: 'inherit',
      h1Size: '1.9em', h2Size: '1.5em',
      h1BorderBottom: '1px solid #d0d7de', h2BorderBottom: '1px solid #d0d7de',
      codeBg: '#f0f0f0', codeColor: '#d63384',
      preBg: '#f6f8fa', preBorder: '1px solid #d0d7de', preCodeColor: '#1f2328',
      bqBorder: '4px solid #d0d7de', bqColor: '#656d76', bqBg: 'none',
      thBg: '#f6f8fa', linkColor: '#0969da',
      strongColor: '#1f2328', hrColor: ''
    }
  },
  {
    id: 'minimal', name: '极简黑白',
    props: {
      fontFamily: 'var(--f-body)', fontSize: '14px', lineHeight: '1.75', textColor: '#1a1a1a',
      hColor: '#111', hFontFamily: 'var(--f-body)',
      h1Size: '1.8em', h2Size: '1.4em',
      h1BorderBottom: 'none', h2BorderBottom: 'none',
      codeBg: '#f5f5f5', codeColor: '#333',
      preBg: '#fafafa', preBorder: '1px solid #e5e5e5', preCodeColor: '',
      bqBorder: '2px solid #333', bqColor: '#555', bqBg: 'none',
      thBg: '#f5f5f5', linkColor: '#000',
      strongColor: '', hrColor: '1px solid #ddd'
    }
  },
  {
    id: 'dark-prose', name: '深色沉浸',
    props: {
      fontFamily: "Georgia, 'Noto Serif CJK SC', 'Source Han Serif SC', 'STSong', serif",
      fontSize: '16px', lineHeight: '1.8', textColor: '#d4cfc8',
      hColor: '#f0ebe0', hFontFamily: "Georgia, 'Noto Serif CJK SC', serif",
      h1Size: '1.7em', h2Size: '1.35em',
      h1BorderBottom: 'none', h2BorderBottom: 'none',
      codeBg: '#2a2520', codeColor: '#e8b87a',
      preBg: '#1e1b17', preBorder: '1px solid #3a3530', preCodeColor: '#c8c0b4',
      bqBorder: '3px solid #8a6d4b', bqColor: '#a09888', bqBg: 'linear-gradient(90deg, #1e1b17 0%, transparent 100%)',
      thBg: '#2a2520', linkColor: '#d4a76a',
      strongColor: '#f0ebe0', hrColor: '1px solid #3a3530'
    }
  }
]

// ── 自定义主题 ──
const customThemes = ref(loadCustomThemes())
const editing = ref(null)

function loadCustomThemes() {
  try { return JSON.parse(localStorage.getItem('mdCustomThemes') || '[]') }
  catch { return [] }
}
function saveCustomThemes() {
  localStorage.setItem('mdCustomThemes', JSON.stringify(customThemes.value))
}
function presetName(id) {
  return presets.find(p => p.id === id)?.name || id
}
function cloneProps(p) { return JSON.parse(JSON.stringify(p)) }

function copyPreset(preset) {
  const theme = {
    id: 'custom-' + Date.now(),
    name: preset.name + ' (副本)',
    basePreset: preset.id,
    props: cloneProps(preset.props)
  }
  editing.value = theme
}

function createBlank() {
  editing.value = {
    id: 'custom-' + Date.now(),
    name: '新主题',
    basePreset: null,
    props: {
      fontFamily: '', fontSize: '', lineHeight: '', textColor: '',
      hColor: '', hFontFamily: '',
      h1Size: '', h2Size: '',
      h1BorderBottom: '', h2BorderBottom: '',
      codeBg: '', codeColor: '',
      preBg: '', preBorder: '', preCodeColor: '',
      bqBorder: '', bqColor: '', bqBg: '',
      thBg: '', linkColor: '',
      strongColor: '', hrColor: ''
    }
  }
}

function editTheme(theme) {
  // 深拷贝进入编辑
  editing.value = JSON.parse(JSON.stringify(theme))
}

function deleteTheme(theme) {
  customThemes.value = customThemes.value.filter(t => t.id !== theme.id)
  saveCustomThemes()
}

function resetToPreset() {
  if (!editing.value?.basePreset) return
  const preset = presets.find(p => p.id === editing.value.basePreset)
  if (preset) editing.value.props = cloneProps(preset.props)
}

function saveEditing() {
  if (!editing.value) return
  if (!editing.value.name.trim()) editing.value.name = '未命名主题'
  const idx = customThemes.value.findIndex(t => t.id === editing.value.id)
  if (idx >= 0) {
    customThemes.value[idx] = JSON.parse(JSON.stringify(editing.value))
  } else {
    customThemes.value.push(JSON.parse(JSON.stringify(editing.value)))
  }
  saveCustomThemes()
  editing.value = null
}

// ── 自定义主题卡片预览的内联样式 ──
function previewStyle(p) {
  const s = {}
  if (p.fontFamily) s.fontFamily = p.fontFamily
  if (p.fontSize) s.fontSize = p.fontSize
  if (p.lineHeight) s.lineHeight = p.lineHeight
  if (p.textColor) s.color = p.textColor
  if (p.hColor) s['--ph-color'] = p.hColor
  return s
}
function codeStyle(p) {
  const s = {}
  if (p.codeBg) s.background = p.codeBg
  if (p.codeColor) s.color = p.codeColor
  return s
}
function bqStyle(p) {
  const s = {}
  if (p.bqBorder) s.borderLeft = p.bqBorder
  if (p.bqColor) s.color = p.bqColor
  return s
}
</script>

<style scoped>
.theme-config { display: flex; flex-direction: column; gap: var(--sp-3); }
.section-label { font-weight: var(--fw-semibold); color: var(--c-text); font-size: var(--fs-sm); }
.section-header { display: flex; align-items: center; justify-content: space-between; }

/* 预设卡片网格 */
.preset-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--sp-3); }
.custom-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--sp-3); }

.theme-card {
  border: 2px solid var(--c-border); border-radius: var(--radius-md);
  overflow: hidden; transition: border-color var(--t-fast);
}
.theme-card:hover { border-color: var(--c-text-3); }
.theme-card.active { border-color: var(--c-primary); box-shadow: 0 0 0 1px var(--c-primary); }

/* 卡片内预览区 */
.theme-card-preview {
  height: 100px; overflow: hidden; padding: var(--sp-2);
  background: var(--c-surface);
}
.preview-content { font-size: 11px; line-height: 1.5; }
.preview-h2 { font-weight: 600; font-size: 13px; margin-bottom: 4px; color: var(--ph-color, inherit); }
.preview-p { margin-bottom: 4px; }
.preview-code {
  padding: 1px 4px; border-radius: 3px; font-size: 0.9em;
}
.preview-bq {
  border-left: 3px solid var(--c-border); padding-left: 8px;
  color: var(--c-text-2); font-size: 10px;
}

/* 卡片底部 */
.theme-card-info {
  padding: var(--sp-1) var(--sp-2); display: flex; align-items: center;
  justify-content: space-between; border-top: 1px solid var(--c-border);
  background: var(--c-card);
}
.theme-card-name { font-size: var(--fs-xs); font-weight: var(--fw-medium); color: var(--c-text); }
.theme-card-actions { display: flex; gap: 4px; }
.theme-card-actions .btn { font-size: 11px; padding: 2px 8px; }

.empty-hint { color: var(--c-text-3); font-size: var(--fs-sm); padding: var(--sp-2) 0; }
.text-danger { color: var(--c-red, #D94F3B); }

/* 编辑区 */
.edit-section {
  border-top: 1px solid var(--c-border); padding-top: var(--sp-3);
  display: flex; flex-direction: column; gap: var(--sp-2);
}
.edit-section-header {
  display: flex; align-items: center; gap: var(--sp-2);
  font-weight: var(--fw-semibold); color: var(--c-text); font-size: var(--fs-sm);
}
.edit-base { font-weight: normal; color: var(--c-text-3); font-size: var(--fs-xs); }

.edit-form { display: flex; flex-direction: column; gap: var(--sp-2); max-height: 300px; overflow-y: auto; }
.prop-group { display: flex; flex-direction: column; gap: 4px; }
.prop-group-title {
  font-size: var(--fs-xs); font-weight: var(--fw-semibold); color: var(--c-text-2);
  border-bottom: 1px solid var(--c-border); padding-bottom: 2px; margin-top: var(--sp-1);
}

.form-row { display: flex; align-items: center; gap: var(--sp-2); }
.form-row label { min-width: 80px; font-size: var(--fs-xs); color: var(--c-text-2); flex-shrink: 0; }
.form-row .input { flex: 1; }
.form-row .input.short { max-width: 120px; }
.form-row input[type="color"] {
  width: 28px; height: 28px; border: 1px solid var(--c-border);
  border-radius: var(--radius-sm); cursor: pointer; padding: 2px; flex-shrink: 0;
}
.form-row.compact { gap: 6px; }

.edit-actions { display: flex; justify-content: flex-end; gap: var(--sp-2); padding-top: var(--sp-2); }
</style>
