import { reactive } from 'vue'

const toasts = reactive([])
let idCounter = 0

export function useToast() {
  function show(message, type = 'info', duration = 3000) {
    const id = ++idCounter
    toasts.push({ id, message, type, leaving: false })
    setTimeout(() => dismiss(id), duration)
    return id
  }

  function dismiss(id) {
    const t = toasts.find(t => t.id === id)
    if (t) {
      t.leaving = true
      setTimeout(() => {
        const idx = toasts.findIndex(t => t.id === id)
        if (idx !== -1) toasts.splice(idx, 1)
      }, 300)
    }
  }

  return { toasts, show, dismiss, success: (msg) => show(msg, 'success'),
    error: (msg) => show(msg, 'error'), warning: (msg) => show(msg, 'warning') }
}
