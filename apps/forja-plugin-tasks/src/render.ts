import type { Section, TasksState } from './types'
import { escapeHtml, renderInlineMarkdown } from './utils'
import {
  dragState,
  clearDropIndicators,
  onTaskDragStart,
  onTaskDragEnd,
  onTaskDragOver,
  onDropZoneDragOver,
  onDropZoneDragLeave,
  onSectionDragStart,
  onSectionDragEnd,
} from './drag-drop'

export interface DOMElements {
  projectNameEl: HTMLElement
  statsEl: HTMLElement
  statsTextEl: HTMLElement
  statsProgressFill: HTMLElement
  noProjectState: HTMLElement
  noFileState: HTMLElement
  loadingState: HTMLElement
  emptyState: HTMLElement
  taskListEl: HTMLElement
  addFormEl: HTMLElement
  reloadBtn: HTMLElement
}

export type MoveTaskFn = (fromSection: number, fromIndex: number, toSection: number, toIndex: number) => void
export type MoveSectionFn = (fromIndex: number, toIndex: number) => void
export type ToggleTaskFn = (sectionIndex: number, taskIndex: number) => void
export type DeleteTaskFn = (sectionIndex: number, taskIndex: number) => void
export type DeleteSectionFn = (sectionIndex: number) => void
export type ShowInlineAddFormFn = (sectionIndex: number, btn: HTMLElement) => void
export type MakeEditableFn = (el: HTMLElement, sectionIndex: number, taskIndex: number, field: 'title' | 'description') => void
export type MakeEditableEmptyFn = (el: HTMLElement, sectionIndex: number, taskIndex: number, field: 'title' | 'description') => void

export interface RenderCallbacks {
  moveTask: MoveTaskFn
  moveSection: MoveSectionFn
  toggleTask: ToggleTaskFn
  deleteTask: DeleteTaskFn
  deleteSection: DeleteSectionFn
  showInlineAddForm: ShowInlineAddFormFn
  makeEditable: MakeEditableFn
  makeEditableEmpty: MakeEditableEmptyFn
}

export function render(state: TasksState, elements: DOMElements, callbacks: RenderCallbacks): void {
  let total = 0
  let done = 0
  for (const section of state.sections) {
    for (const task of section.tasks) {
      total++
      if (task.done) done++
    }
  }

  elements.projectNameEl.textContent = state.projectName ?? 'No project'

  if (total > 0) {
    elements.statsEl.classList.add('visible')
    elements.statsTextEl.textContent = `${done}/${total}`
    elements.statsProgressFill.style.width = `${Math.round((done / total) * 100)}%`
  } else {
    elements.statsEl.classList.remove('visible')
  }

  const hasProject = !!state.projectPath
  const hasTasks = total > 0
  const hasFile = state.fileExists

  elements.noProjectState.style.display = !hasProject ? '' : 'none'
  elements.loadingState.style.display = hasProject && state.loading ? '' : 'none'
  elements.noFileState.style.display = hasProject && !state.loading && !hasFile ? '' : 'none'
  elements.emptyState.style.display = hasProject && !state.loading && hasFile && !hasTasks ? '' : 'none'
  elements.taskListEl.style.display = hasProject && !state.loading && hasFile ? '' : 'none'
  elements.addFormEl.style.display = hasProject && !state.loading && hasFile ? '' : 'none'
  elements.reloadBtn.style.display = hasProject && hasFile ? '' : 'none'

  // Rebuild task list
  elements.taskListEl.innerHTML = ''

  for (let si = 0; si < state.sections.length; si++) {
    const section = state.sections[si]
    const sectionEl = document.createElement('div')
    sectionEl.className = 'section'

    if (section.title) {
      sectionEl.setAttribute('data-section-index', String(si))
      sectionEl.appendChild(createSectionHeader(section, si, callbacks))
    }

    for (let ti = 0; ti < section.tasks.length; ti++) {
      sectionEl.appendChild(createTaskEl(si, ti, section.tasks[ti], elements.taskListEl, callbacks))
    }

    // Drop zone at end of section (visible only while dragging tasks)
    const dropZone = document.createElement('div')
    dropZone.className = 'section-drop-zone';

    (function capturedSi(sIdx: number) {
      dropZone.addEventListener('dragover', onDropZoneDragOver)
      dropZone.addEventListener('dragleave', onDropZoneDragLeave)
      dropZone.addEventListener('drop', (e: DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!dragState.active || dragState.type !== 'task') return

        const toIndex = state.sections[sIdx].tasks.length
        callbacks.moveTask(dragState.fromSection, dragState.fromIndex, sIdx, toIndex)
        dragState.active = false
        dragState.type = null
        document.body.classList.remove('is-dragging', 'is-dragging-task')
        clearDropIndicators(elements.taskListEl)
      })
    })(si)

    sectionEl.appendChild(dropZone)
    sectionEl.appendChild(createAddTaskBtn(si, callbacks.showInlineAddForm))
    elements.taskListEl.appendChild(sectionEl)
  }

  // Section drag delegation
  setupSectionDragDelegation(elements.taskListEl, state.sections, callbacks.moveSection)
}

function createSectionHeader(section: Section, si: number, callbacks: RenderCallbacks): HTMLElement {
  let sectionDone = 0
  for (const task of section.tasks) {
    if (task.done) sectionDone++
  }

  const headerEl = document.createElement('div')
  headerEl.className = 'section-header'

  const sectionDragHandle = document.createElement('span')
  sectionDragHandle.className = 'section-drag-handle'
  sectionDragHandle.setAttribute('aria-hidden', 'true')
  sectionDragHandle.title = 'Drag to reorder section'

  sectionDragHandle.addEventListener('mousedown', () => { headerEl.draggable = true })
  sectionDragHandle.addEventListener('mouseup', () => { headerEl.draggable = false })
  headerEl.addEventListener('dragstart', (e: DragEvent) => {
    if (!headerEl.draggable) { e.preventDefault(); return }
    onSectionDragStart(e, si)
  })
  headerEl.addEventListener('dragend', () => {
    headerEl.draggable = false
    // taskListEl is not accessible here; handled by delegation in setupSectionDragDelegation
  })

  const titleSpan = document.createElement('span')
  titleSpan.className = 'section-title'
  titleSpan.textContent = section.title!

  const actionsSpan = document.createElement('span')
  actionsSpan.className = 'section-actions'

  const countSpan = document.createElement('span')
  countSpan.className = 'section-count'
  countSpan.textContent = `${sectionDone}/${section.tasks.length}`

  const deleteSectionBtn = document.createElement('button')
  deleteSectionBtn.type = 'button'
  deleteSectionBtn.className = 'section-delete-btn'
  deleteSectionBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>'
  deleteSectionBtn.title = 'Remove section'
  deleteSectionBtn.setAttribute('aria-label', `Remove section ${section.title}`)
  deleteSectionBtn.addEventListener('click', () => callbacks.deleteSection(si))

  actionsSpan.appendChild(countSpan)
  actionsSpan.appendChild(deleteSectionBtn)
  headerEl.appendChild(sectionDragHandle)
  headerEl.appendChild(titleSpan)
  headerEl.appendChild(actionsSpan)

  return headerEl
}

function createAddTaskBtn(sectionIndex: number, showInlineAddForm: ShowInlineAddFormFn): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'btn-add-inline'
  btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg> Add task'
  btn.setAttribute('aria-label', 'Add task to this section')
  btn.addEventListener('click', () => showInlineAddForm(sectionIndex, btn))
  return btn
}

export function createTaskEl(
  sectionIndex: number,
  taskIndex: number,
  task: { title: string; description: string; done: boolean },
  taskListEl: HTMLElement,
  callbacks: RenderCallbacks,
): HTMLElement {
  const el = document.createElement('div')
  el.className = 'task-item' + (task.done ? ' completed' : '')

  const handle = document.createElement('span')
  handle.className = 'drag-handle'
  handle.setAttribute('aria-hidden', 'true')
  handle.title = 'Drag to reorder'

  handle.addEventListener('mousedown', () => { el.draggable = true })
  handle.addEventListener('mouseup', () => { el.draggable = false })

  el.addEventListener('dragstart', (e: DragEvent) => {
    if (!el.draggable) { e.preventDefault(); return }
    onTaskDragStart(e, sectionIndex, taskIndex)
  })
  el.addEventListener('dragend', (e: DragEvent) => {
    el.draggable = false
    onTaskDragEnd(e, taskListEl)
  })
  el.addEventListener('dragover', (e: DragEvent) => onTaskDragOver(e, taskListEl))
  el.addEventListener('drop', (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!dragState.active || dragState.type !== 'task') return

    const rect = el.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const insertIndex = e.clientY < midY ? taskIndex : taskIndex + 1

    callbacks.moveTask(dragState.fromSection, dragState.fromIndex, sectionIndex, insertIndex)
    dragState.active = false
    dragState.type = null
    document.body.classList.remove('is-dragging', 'is-dragging-task')
    clearDropIndicators(taskListEl)
  })
  el.addEventListener('dragleave', (e: DragEvent) => {
    if (!el.contains(e.relatedTarget as Node)) {
      el.classList.remove('drop-above', 'drop-below')
    }
  })

  const checkbox = document.createElement('input')
  checkbox.type = 'checkbox'
  checkbox.className = 'task-checkbox'
  checkbox.checked = task.done
  checkbox.setAttribute('aria-label', `Toggle ${escapeHtml(task.title)}`)
  checkbox.addEventListener('change', () => callbacks.toggleTask(sectionIndex, taskIndex))

  const content = document.createElement('div')
  content.className = 'task-content'

  const titleEl = document.createElement('div')
  titleEl.className = 'task-title'
  titleEl.innerHTML = renderInlineMarkdown(task.title)
  titleEl.title = 'Click to edit'
  titleEl.addEventListener('click', (e: MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'A') return
    if (!task.done) callbacks.makeEditable(titleEl, sectionIndex, taskIndex, 'title')
  })
  content.appendChild(titleEl)

  if (task.description) {
    const descEl = document.createElement('div')
    descEl.className = 'task-description'
    descEl.innerHTML = renderInlineMarkdown(task.description)
    descEl.title = 'Click to edit'
    descEl.addEventListener('click', (e: MouseEvent) => {
      if ((e.target as HTMLElement).tagName === 'A') return
      if (!task.done) callbacks.makeEditable(descEl, sectionIndex, taskIndex, 'description')
    })
    content.appendChild(descEl)
  } else {
    const descPlaceholderEl = document.createElement('div')
    descPlaceholderEl.className = 'task-description-placeholder'
    descPlaceholderEl.textContent = 'Add description...'
    descPlaceholderEl.addEventListener('click', () => {
      if (!task.done) {
        callbacks.makeEditableEmpty(descPlaceholderEl, sectionIndex, taskIndex, 'description')
      }
    })
    content.appendChild(descPlaceholderEl)
  }

  const deleteBtn = document.createElement('button')
  deleteBtn.className = 'task-delete'
  deleteBtn.type = 'button'
  deleteBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>'
  deleteBtn.setAttribute('aria-label', `Delete ${escapeHtml(task.title)}`)
  deleteBtn.addEventListener('click', () => callbacks.deleteTask(sectionIndex, taskIndex))

  el.appendChild(handle)
  el.appendChild(checkbox)
  el.appendChild(content)
  el.appendChild(deleteBtn)

  return el
}

let sectionDragDelegationSetup = false

function setupSectionDragDelegation(taskListEl: HTMLElement, sections: Section[], moveSection: MoveSectionFn): void {
  // Only setup once (listeners persist across renders via event delegation)
  if (sectionDragDelegationSetup) return
  sectionDragDelegationSetup = true

  taskListEl.addEventListener('dragover', (e: DragEvent) => {
    if (!dragState.active || dragState.type !== 'section') return
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'

    clearDropIndicators(taskListEl)

    const targetEl = findSectionAtPoint(taskListEl, e.clientY)
    if (!targetEl) return

    const targetIndex = parseInt(targetEl.getAttribute('data-section-index') ?? '-1', 10)
    if (targetIndex === dragState.fromSection) return

    const rect = targetEl.getBoundingClientRect()
    const midY = rect.top + rect.height / 2

    if (e.clientY < midY) {
      targetEl.classList.add('section-drop-above')
    } else {
      targetEl.classList.add('section-drop-below')
    }
  })

  taskListEl.addEventListener('drop', (e: DragEvent) => {
    if (!dragState.active || dragState.type !== 'section') return
    e.preventDefault()

    const targetEl = findSectionAtPoint(taskListEl, e.clientY)
    if (!targetEl) return

    const targetIndex = parseInt(targetEl.getAttribute('data-section-index') ?? '-1', 10)
    if (targetIndex === dragState.fromSection) {
      dragState.active = false
      dragState.type = null
      document.body.classList.remove('is-dragging', 'is-dragging-section')
      clearDropIndicators(taskListEl)
      return
    }

    const rect = targetEl.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const insertIndex = e.clientY < midY ? targetIndex : targetIndex + 1

    moveSection(dragState.fromSection, insertIndex)
    dragState.active = false
    dragState.type = null
    document.body.classList.remove('is-dragging', 'is-dragging-section')
    clearDropIndicators(taskListEl)
  })
}

function findSectionAtPoint(taskListEl: HTMLElement, clientY: number): HTMLElement | null {
  const sectionEls = taskListEl.querySelectorAll<HTMLElement>('.section[data-section-index]')
  for (const el of sectionEls) {
    const rect = el.getBoundingClientRect()
    if (clientY >= rect.top && clientY <= rect.bottom) return el
  }
  if (sectionEls.length > 0) {
    const lastEl = sectionEls[sectionEls.length - 1]
    const lastRect = lastEl.getBoundingClientRect()
    if (clientY > lastRect.bottom) return lastEl
  }
  return null
}
