<template>
  <div class="markdown-body" :class="'md-theme-' + theme" ref="bodyEl" v-html="rendered" @click="onClick"></div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'
import { marked } from 'marked'

const props = defineProps({
  content: { type: String, default: '' },
  theme: { type: String, default: 'default' }
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
/* ══════ 基础样式（default 主题继承这些） ══════ */
.markdown-body { line-height: var(--lh-relaxed); color: var(--c-text); word-break: break-word; }

.markdown-body h1,.markdown-body h2,.markdown-body h3,.markdown-body h4,.markdown-body h5,.markdown-body h6 {
  font-weight: var(--fw-semibold); margin: 1.2em 0 0.5em;
  color: var(--c-text); line-height: 1.3;
}
.markdown-body h1 { font-size: 1.6em; }
.markdown-body h2 { font-size: 1.35em; }
.markdown-body h3 { font-size: 1.15em; }
.markdown-body h4 { font-size: 1.05em; }
.markdown-body h5 { font-size: 0.95em; }
.markdown-body h6 { font-size: 0.85em; color: var(--c-text-2); }

.markdown-body p { margin: 0.6em 0; }

.markdown-body ul,.markdown-body ol { padding-left: 1.5em; margin: 0.5em 0; }
.markdown-body li { margin: 0.2em 0; }
.markdown-body li > p { margin: 0.2em 0; }

.markdown-body code {
  padding: 2px 6px; border-radius: 4px;
  font-family: var(--f-mono); font-size: 0.9em;
}
.markdown-body pre {
  padding: var(--sp-3); border-radius: var(--radius-md);
  overflow-x: auto; margin: 0.6em 0;
}
.markdown-body pre code { background: none; padding: 0; font-size: 0.88em; }

.markdown-body blockquote {
  border-left: 3px solid var(--c-blue); margin: 0.6em 0;
  padding: 0.3em 1em; color: var(--c-text-2);
}
.markdown-body blockquote > :first-child { margin-top: 0; }
.markdown-body blockquote > :last-child { margin-bottom: 0; }

.markdown-body table { border-collapse: collapse; width: 100%; margin: 0.8em 0; }
.markdown-body th,.markdown-body td {
  border: 1px solid var(--c-border); padding: 8px 12px; text-align: left;
}
.markdown-body th { font-weight: var(--fw-semibold); }

.markdown-body a { text-decoration: underline; text-underline-offset: 2px; }
.markdown-body a:hover { opacity: 0.8; }

.markdown-body img { max-width: 100%; border-radius: var(--radius-md); }

.markdown-body hr { border: none; border-top: 1px solid var(--c-border); margin: 1.2em 0; }

.markdown-body strong { font-weight: var(--fw-bold); color: var(--c-text); }

.markdown-body input[type="checkbox"] {
  margin-right: 6px; accent-color: var(--c-primary);
  transform: translateY(1px);
}

/* Mermaid */
.mermaid-svg { text-align: center; overflow-x: auto; margin: 0.8em 0; }
.mermaid-svg svg { max-width: 100%; }
.mermaid-error { border-left: 3px solid var(--c-red, #D94F3B) !important; opacity: 0.7; }
.mermaid-error::before { content: "⚠ Mermaid 语法错误"; display: block; color: var(--c-red, #D94F3B); font-size: 0.8em; margin-bottom: 4px; }


/* ══════ 主题：default（暖色工作室，当前默认） ══════ */
.markdown-body.md-theme-default h1 { border-bottom: 2px solid var(--c-border); padding-bottom: 0.3em; }
.markdown-body.md-theme-default h2 { border-bottom: 1px solid var(--c-border); padding-bottom: 0.2em; }
.markdown-body.md-theme-default h1,.markdown-body.md-theme-default h2,.markdown-body.md-theme-default h3,
.markdown-body.md-theme-default h4,.markdown-body.md-theme-default h5,.markdown-body.md-theme-default h6 {
  font-family: var(--f-display);
}
.markdown-body.md-theme-default code { background: var(--c-bg); color: var(--c-primary); }
.markdown-body.md-theme-default pre { background: var(--c-bg); border: 1px solid var(--c-border); }
.markdown-body.md-theme-default blockquote { background: var(--c-bg); }
.markdown-body.md-theme-default th { background: var(--c-bg); }
.markdown-body.md-theme-default a { color: var(--c-blue); }


/* ══════ 主题：classic（GitHub 风格） ══════ */
.markdown-body.md-theme-classic {
  font-family: -apple-system, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  font-size: 15px; line-height: 1.65;
}
.markdown-body.md-theme-classic h1,.markdown-body.md-theme-classic h2,.markdown-body.md-theme-classic h3,
.markdown-body.md-theme-classic h4,.markdown-body.md-theme-classic h5,.markdown-body.md-theme-classic h6 {
  font-family: inherit; font-weight: 600;
}
.markdown-body.md-theme-classic h1 { font-size: 1.9em; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
.markdown-body.md-theme-classic h2 { font-size: 1.5em; border-bottom: 1px solid #d0d7de; padding-bottom: 0.25em; }
.markdown-body.md-theme-classic h3 { font-size: 1.25em; }
.markdown-body.md-theme-classic h4 { font-size: 1.05em; }
.markdown-body.md-theme-classic code {
  background: #f0f0f0; color: #d63384; padding: 2px 6px; border-radius: 6px; font-size: 0.88em;
}
.markdown-body.md-theme-classic pre {
  background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 6px;
}
.markdown-body.md-theme-classic pre code { color: #1f2328; }
.markdown-body.md-theme-classic blockquote {
  border-left: 4px solid #d0d7de; color: #656d76; background: none;
}
.markdown-body.md-theme-classic th { background: #f6f8fa; }
.markdown-body.md-theme-classic a { color: #0969da; }
.markdown-body.md-theme-classic strong { color: #1f2328; }

/* classic dark */
.dark .markdown-body.md-theme-classic code { background: #2d333b; color: #f2a8cd; }
.dark .markdown-body.md-theme-classic pre { background: #1c2128; border-color: #444c56; }
.dark .markdown-body.md-theme-classic pre code { color: #e6edf3; }
.dark .markdown-body.md-theme-classic blockquote { border-color: #444c56; color: #8b949e; background: none; }
.dark .markdown-body.md-theme-classic th { background: #1c2128; }
.dark .markdown-body.md-theme-classic a { color: #71b7ff; }
.dark .markdown-body.md-theme-classic strong { color: #e6edf3; }


/* ══════ 主题：minimal（极简，高对比） ══════ */
.markdown-body.md-theme-minimal {
  font-family: var(--f-body); font-size: 14px; line-height: 1.75; color: #1a1a1a;
}
.markdown-body.md-theme-minimal h1,.markdown-body.md-theme-minimal h2,.markdown-body.md-theme-minimal h3,
.markdown-body.md-theme-minimal h4,.markdown-body.md-theme-minimal h5,.markdown-body.md-theme-minimal h6 {
  font-family: var(--f-body); font-weight: 700; color: #111; border: none;
}
.markdown-body.md-theme-minimal h1 { font-size: 1.8em; margin-top: 1.5em; }
.markdown-body.md-theme-minimal h2 { font-size: 1.4em; margin-top: 1.3em; }
.markdown-body.md-theme-minimal h3 { font-size: 1.15em; margin-top: 1em; }
.markdown-body.md-theme-minimal code {
  background: #f5f5f5; color: #333; padding: 2px 4px; border-radius: 3px;
  font-size: 0.9em; border: 1px solid #e5e5e5;
}
.markdown-body.md-theme-minimal pre {
  background: #fafafa; border: 1px solid #e5e5e5; border-radius: 4px;
}
.markdown-body.md-theme-minimal blockquote {
  border-left: 2px solid #333; color: #555; background: none;
}
.markdown-body.md-theme-minimal th { background: #f5f5f5; }
.markdown-body.md-theme-minimal a { color: #000; text-underline-offset: 3px; }
.markdown-body.md-theme-minimal hr { border-top: 1px solid #ddd; }

/* minimal dark */
.dark .markdown-body.md-theme-minimal { color: #ddd; }
.dark .markdown-body.md-theme-minimal h1,.dark .markdown-body.md-theme-minimal h2,
.dark .markdown-body.md-theme-minimal h3,.dark .markdown-body.md-theme-minimal h4,
.dark .markdown-body.md-theme-minimal h5,.dark .markdown-body.md-theme-minimal h6 { color: #f0f0f0; }
.dark .markdown-body.md-theme-minimal code { background: #222; color: #ddd; border-color: #444; }
.dark .markdown-body.md-theme-minimal pre { background: #1a1a1a; border-color: #444; }
.dark .markdown-body.md-theme-minimal blockquote { border-left-color: #888; color: #aaa; background: none; }
.dark .markdown-body.md-theme-minimal th { background: #1a1a1a; }
.dark .markdown-body.md-theme-minimal a { color: #fff; }
.dark .markdown-body.md-theme-minimal hr { border-top-color: #444; }


/* ══════ 主题：dark-prose（深色沉浸阅读） ══════ */
.markdown-body.md-theme-dark-prose {
  font-family: Georgia, 'Noto Serif CJK SC', 'Source Han Serif SC', 'STSong', serif;
  font-size: 16px; line-height: 1.8; color: #d4cfc8;
}
.markdown-body.md-theme-dark-prose h1,.markdown-body.md-theme-dark-prose h2,.markdown-body.md-theme-dark-prose h3,
.markdown-body.md-theme-dark-prose h4,.markdown-body.md-theme-dark-prose h5,.markdown-body.md-theme-dark-prose h6 {
  font-family: Georgia, 'Noto Serif CJK SC', serif; font-weight: 600;
  color: #f0ebe0; border: none;
}
.markdown-body.md-theme-dark-prose h1 { font-size: 1.7em; }
.markdown-body.md-theme-dark-prose h2 { font-size: 1.35em; color: #e8b87a; }
.markdown-body.md-theme-dark-prose h3 { font-size: 1.15em; color: #c9a87c; }
.markdown-body.md-theme-dark-prose h4 { color: #b8a888; }
.markdown-body.md-theme-dark-prose code {
  background: #2a2520; color: #e8b87a; padding: 2px 6px; border-radius: 4px;
}
.markdown-body.md-theme-dark-prose pre {
  background: #1e1b17; border: 1px solid #3a3530; border-radius: 6px;
}
.markdown-body.md-theme-dark-prose pre code { color: #c8c0b4; }
.markdown-body.md-theme-dark-prose blockquote {
  border-left: 3px solid #8a6d4b; color: #a09888; background: linear-gradient(90deg, #1e1b17 0%, transparent 100%);
}
.markdown-body.md-theme-dark-prose th { background: #2a2520; }
.markdown-body.md-theme-dark-prose td,.markdown-body.md-theme-dark-prose th { border-color: #3a3530; }
.markdown-body.md-theme-dark-prose a { color: #d4a76a; }
.markdown-body.md-theme-dark-prose strong { color: #f0ebe0; }
.markdown-body.md-theme-dark-prose hr { border-top: 1px solid #3a3530; }
</style>
