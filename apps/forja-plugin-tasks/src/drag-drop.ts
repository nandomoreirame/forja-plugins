import type { DragState } from './types'

export const dragState: DragState = {
  active: false,
  type: null,
  fromSection: -1,
  fromIndex: -1,
}

export function clearDropIndicators(taskListEl: HTMLElement): void {
  const items = taskListEl.querySelectorAll('.drop-above, .drop-below')
  items.forEach(el => el.classList.remove('drop-above', 'drop-below'))

  const zones = taskListEl.querySelectorAll('.section-drop-zone-active')
  zones.forEach(el => el.classList.remove('section-drop-zone-active'))

  const sectionIndicators = taskListEl.querySelectorAll('.section-drop-above, .section-drop-below')
  sectionIndicators.forEach(el => el.classList.remove('section-drop-above', 'section-drop-below'))
}

// --- Task Drag ---

export function onTaskDragStart(e: DragEvent, sectionIndex: number, taskIndex: number): void {
  dragState.active = true
  dragState.type = 'task'
  dragState.fromSection = sectionIndex
  dragState.fromIndex = taskIndex

  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', `task:${sectionIndex}:${taskIndex}`)
  }

  document.body.classList.add('is-dragging', 'is-dragging-task')

  requestAnimationFrame(() => {
    const target = e.target as HTMLElement
    if (target?.classList) {
      target.classList.add('dragging')
    }
  })
}

export function onTaskDragEnd(e: DragEvent, taskListEl: HTMLElement): void {
  const target = e.target as HTMLElement
  if (target?.classList) {
    target.classList.remove('dragging')
  }
  dragState.active = false
  dragState.type = null
  document.body.classList.remove('is-dragging', 'is-dragging-task', 'is-dragging-section')
  clearDropIndicators(taskListEl)
}

export function onTaskDragOver(e: DragEvent, taskListEl: HTMLElement): void {
  if (!dragState.active || dragState.type !== 'task') return
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'

  clearDropIndicators(taskListEl)

  const taskItem = e.currentTarget as HTMLElement
  const rect = taskItem.getBoundingClientRect()
  const midY = rect.top + rect.height / 2

  if (e.clientY < midY) {
    taskItem.classList.add('drop-above')
  } else {
    taskItem.classList.add('drop-below')
  }
}

export function onDropZoneDragOver(e: DragEvent): void {
  if (!dragState.active || dragState.type !== 'task') return
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  const zone = e.currentTarget as HTMLElement
  zone.classList.add('section-drop-zone-active')
}

export function onDropZoneDragLeave(e: DragEvent): void {
  const zone = e.currentTarget as HTMLElement
  zone.classList.remove('section-drop-zone-active')
}

// --- Section Drag ---

export function onSectionDragStart(e: DragEvent, sectionIndex: number): void {
  dragState.active = true
  dragState.type = 'section'
  dragState.fromSection = sectionIndex
  dragState.fromIndex = -1

  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', `section:${sectionIndex}`)
  }

  document.body.classList.add('is-dragging', 'is-dragging-section')

  requestAnimationFrame(() => {
    const target = e.target as HTMLElement
    const sectionEl = target?.closest('.section')
    if (sectionEl) {
      sectionEl.classList.add('section-dragging')
    }
  })
}

export function onSectionDragEnd(taskListEl: HTMLElement): void {
  const allSections = taskListEl.querySelectorAll('.section-dragging')
  allSections.forEach(el => el.classList.remove('section-dragging'))
  dragState.active = false
  dragState.type = null
  document.body.classList.remove('is-dragging', 'is-dragging-task', 'is-dragging-section')
  clearDropIndicators(taskListEl)
}

export function findSectionAtPoint(taskListEl: HTMLElement, clientY: number): HTMLElement | null {
  const sectionEls = taskListEl.querySelectorAll<HTMLElement>('.section[data-section-index]')
  for (const el of sectionEls) {
    const rect = el.getBoundingClientRect()
    if (clientY >= rect.top && clientY <= rect.bottom) {
      return el
    }
  }
  if (sectionEls.length > 0) {
    const lastEl = sectionEls[sectionEls.length - 1]
    const lastRect = lastEl.getBoundingClientRect()
    if (clientY > lastRect.bottom) return lastEl
  }
  return null
}
