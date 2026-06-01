<template>
  <div class="markdown-body" ref="bodyEl" v-html="rendered" @click="onClick"></div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'
import { marked } from 'marked'

const props = defineProps({
  content: { type: String, default: '' }
})

const emit = defineEmits(['click'])
const bodyEl = ref(null)
const rendered = ref('')
let mermaidReady = false

async function renderMermaidBlocks() {
  if (!bodyEl.value) return
  const blocks = bodyEl.value.querySelectorAll('pre code.language-mermaid')
  if (!blocks.length) return
  if (!mermaidReady) {
    try {
      const mermaid = await import('mermaid')
      mermaid.default.initialize({ startOnLoad: false, theme: 'default' })
      mermaidReady = true
    } catch { return }
  }
  const mermaid = (await import('mermaid')).default
  for (const block of blocks) {
    const pre = block.parentElement
    const id = 'mermaid-' + Math.random().toString(36).slice(2, 8)
    try {
      const { svg } = await mermaid.render(id, block.textContent)
      pre.outerHTML = `<div class="mermaid-svg">${svg}</div>`
    } catch {
      pre.classList.add('mermaid-error')
    }
  }
}

async function render() {
  try {
    rendered.value = marked.parse(props.content || '') || ''
  } catch {
    rendered.value = '<pre>' + escapeHtml(props.content || '') + '</pre>'
  }
  await nextTick()
  await renderMermaidBlocks()
}

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

function onClick(e) {
  emit('click', e)
}

watch(() => props.content, render)
onMounted(render)
</script>

<style>
.markdown-body { line-height: var(--lh-relaxed); color: var(--c-text); word-break: break-word; }

.markdown-body h1,.markdown-body h2,.markdown-body h3,.markdown-body h4 {
  font-family: var(--f-display); font-weight: var(--fw-semibold);
  margin: 1.2em 0 0.5em; color: var(--c-text);
}
.markdown-body h1 { font-size: 1.5em; border-bottom: 2px solid var(--c-border); padding-bottom: 0.3em; }
.markdown-body h2 { font-size: 1.3em; border-bottom: 1px solid var(--c-border); padding-bottom: 0.2em; }
.markdown-body h3 { font-size: 1.1em; }
.markdown-body h4 { font-size: 1em; }

.markdown-body p { margin: 0.6em 0; }

.markdown-body ul,.markdown-body ol { padding-left: 1.5em; margin: 0.5em 0; }
.markdown-body li { margin: 0.2em 0; }

.markdown-body code {
  background: var(--c-bg); padding: 2px 6px; border-radius: 4px;
  font-family: var(--f-mono); font-size: 0.9em;
}
.markdown-body pre {
  background: var(--c-bg); padding: var(--sp-3); border-radius: var(--radius-md);
  overflow-x: auto; margin: 0.6em 0; border: 1px solid var(--c-border);
}
.markdown-body pre code { background: none; padding: 0; }

.markdown-body blockquote {
  border-left: 3px solid var(--c-blue); margin: 0.6em 0;
  padding: 0.3em 1em; color: var(--c-text-2); background: var(--c-bg);
}
.markdown-body table { border-collapse: collapse; width: 100%; margin: 0.6em 0; }
.markdown-body th,.markdown-body td {
  border: 1px solid var(--c-border); padding: 6px 12px; text-align: left;
}
.markdown-body th { background: var(--c-bg); font-weight: var(--fw-semibold); }
.markdown-body a { color: var(--c-blue); text-decoration: underline; }

.markdown-body img { max-width: 100%; border-radius: var(--radius-md); }

.markdown-body hr { border: none; border-top: 1px solid var(--c-border); margin: 1em 0; }

/* Mermaid */
.mermaid-svg { text-align: center; overflow-x: auto; margin: 0.6em 0; }
.mermaid-svg svg { max-width: 100%; }
.mermaid-error { border-left: 3px solid var(--c-red, #D94F3B) !important; opacity: 0.7; }
.mermaid-error::before { content: "⚠ Mermaid 语法错误"; display: block; color: var(--c-red, #D94F3B); font-size: 0.8em; margin-bottom: 4px; }
</style>
