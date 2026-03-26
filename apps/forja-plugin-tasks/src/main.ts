import type { TasksState } from './types'
import { parseMarkdown, toMarkdown } from './parser'
import {
  createInitialState,
  moveTask as moveTaskFn,
  moveSection as moveSectionFn,
  toggleTask as toggleTaskFn,
  deleteTask as deleteTaskFn,
  addTask,
  addSection as addSectionFn,
  deleteSection as deleteSectionFn,
} from './state'
import { render, type DOMElements } from './render'

const FILENAME = 'TASKS.md'

// --- State ---
let state: TasksState = createInitialState()
let saveTimer: ReturnType<typeof setTimeout> | null = null

// --- DOM refs ---
const elements: DOMElements = {
  projectNameEl: document.getElementById('project-name')!,
  statsEl: document.getElementById('stats')!,
  statsTextEl: document.getElementById('stats-text')!,
  statsProgressFill: document.getElementById('stats-progress-fill')!,
  noProjectState: document.getElementById('no-project-state')!,
  noFileState: document.getElementById('no-file-state')!,
  loadingState: document.getElementById('loading-state')!,
  emptyState: document.getElementById('empty-state')!,
  taskListEl: document.getElementById('task-list')!,
  addFormEl: document.getElementById('add-form')!,
  reloadBtn: document.getElementById('reload-btn')!,
}

const newSectionNameInput = document.getElementById('new-section-name') as HTMLInputElement | null
const createFileBtn = document.getElementById('create-file-btn')
const pluginTitleEl = document.getElementById('plugin-title')

// --- Save ---
function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(saveFile, 300)
}

function saveFile(): void {
  if (!state.projectPath || typeof forja === 'undefined') return
  const content = toMarkdown(state.sections)
  forja.fs.writeFile(FILENAME, content).catch(err => {
    console.error('Failed to save TASKS.md:', err)
  })
}

// --- Render bridge ---
function renderState(): void {
  render(state, elements, {
    moveTask: (fromSection, fromIndex, toSection, toIndex) => {
      state = { ...state, sections: moveTaskFn(state.sections, fromSection, fromIndex, toSection, toIndex) }
      renderState()
      scheduleSave()
    },
    moveSection: (fromIndex, toIndex) => {
      state = { ...state, sections: moveSectionFn(state.sections, fromIndex, toIndex) }
      renderState()
      scheduleSave()
    },
    toggleTask: (sectionIndex, taskIndex) => {
      state = { ...state, sections: toggleTaskFn(state.sections, sectionIndex, taskIndex) }
      renderState()
      scheduleSave()
    },
    deleteTask: (sectionIndex, taskIndex) => {
      state = { ...state, sections: deleteTaskFn(state.sections, sectionIndex, taskIndex) }
      renderState()
      scheduleSave()
    },
    deleteSection: (sectionIndex) => {
      state = { ...state, sections: deleteSectionFn(state.sections, sectionIndex) }
      renderState()
      scheduleSave()
    },
    showInlineAddForm: (sectionIndex, btn) => {
      showInlineAddForm(sectionIndex, btn)
    },
    makeEditable: (el, sectionIndex, taskIndex, field) => {
      makeEditable(el, sectionIndex, taskIndex, field)
    },
    makeEditableEmpty: (el, sectionIndex, taskIndex, field) => {
      makeEditableEmpty(el, sectionIndex, taskIndex, field)
    },
  })
}

// --- Inline Editing ---
function makeEditable(
  el: HTMLElement,
  sectionIndex: number,
  taskIndex: number,
  field: 'title' | 'description',
): void {
  if (el.classList.contains('editing')) return
  el.classList.add('editing')

  const originalValue = state.sections[sectionIndex].tasks[taskIndex][field]
  const input = document.createElement(field === 'description' ? 'textarea' : 'input') as HTMLInputElement | HTMLTextAreaElement
  input.className = 'task-inline-input' + (field === 'description' ? ' task-inline-textarea' : '')
  input.value = originalValue

  if (field === 'title') {
    (input as HTMLInputElement).type = 'text'
    input.placeholder = 'Task title...'
  } else {
    input.placeholder = 'Description (optional)';
    (input as HTMLTextAreaElement).rows = 2
  }

  el.textContent = ''
  el.appendChild(input)
  input.focus()
  input.select()

  const commit = () => {
    const newValue = input.value.trim()
    if (field === 'title' && !newValue) {
      el.classList.remove('editing')
      el.textContent = originalValue
      return
    }
    const newSections = state.sections.map((s, si) => {
      if (si !== sectionIndex) return s
      return {
        ...s,
        tasks: s.tasks.map((t, ti) => {
          if (ti !== taskIndex) return t
          return { ...t, [field]: newValue }
        }),
      }
    })
    state = { ...state, sections: newSections }
    el.classList.remove('editing')
    renderState()
    scheduleSave()
  }

  const cancel = () => {
    el.classList.remove('editing')
    el.textContent = originalValue
  }

  input.addEventListener('blur', commit)
  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (field === 'title' && e.key === 'Enter') {
      e.preventDefault()
      input.removeEventListener('blur', commit)
      commit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      input.removeEventListener('blur', commit)
      cancel()
    }
  })
}

function makeEditableEmpty(
  el: HTMLElement,
  sectionIndex: number,
  taskIndex: number,
  field: 'title' | 'description',
): void {
  if (el.classList.contains('editing')) return
  el.classList.add('editing')

  const input = document.createElement('textarea') as HTMLTextAreaElement
  input.className = 'task-inline-input task-inline-textarea'
  input.value = ''
  input.placeholder = 'Description (optional)'
  input.rows = 2

  el.textContent = ''
  el.appendChild(input)
  input.focus()

  const commit = () => {
    const newValue = input.value.trim()
    const newSections = state.sections.map((s, si) => {
      if (si !== sectionIndex) return s
      return {
        ...s,
        tasks: s.tasks.map((t, ti) => {
          if (ti !== taskIndex) return t
          return { ...t, [field]: newValue }
        }),
      }
    })
    state = { ...state, sections: newSections }
    el.classList.remove('editing')
    renderState()
    scheduleSave()
  }

  const cancel = () => {
    el.classList.remove('editing')
    renderState()
  }

  input.addEventListener('blur', commit)
  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      input.removeEventListener('blur', commit)
      cancel()
    }
  })
}

// --- Inline Add Form ---
function showInlineAddForm(sectionIndex: number, triggerBtn: HTMLElement): void {
  const taskListEl = elements.taskListEl
  taskListEl.querySelectorAll('.inline-add-form').forEach(el => el.remove())
  taskListEl.querySelectorAll<HTMLElement>('.btn-add-inline').forEach(b => { b.style.display = '' })

  const form = document.createElement('div')
  form.className = 'inline-add-form'

  const titleInput = document.createElement('input')
  titleInput.type = 'text'
  titleInput.className = 'input-field input-title'
  titleInput.placeholder = 'Task title...'

  const descInput = document.createElement('input')
  descInput.type = 'text'
  descInput.className = 'input-field input-description'
  descInput.placeholder = 'Description (optional)'

  const actionsRow = document.createElement('div')
  actionsRow.className = 'inline-add-actions'

  const confirmBtn = document.createElement('button')
  confirmBtn.type = 'button'
  confirmBtn.className = 'btn btn-primary btn-small'
  confirmBtn.textContent = 'Add'

  const cancelBtn = document.createElement('button')
  cancelBtn.type = 'button'
  cancelBtn.className = 'btn btn-ghost btn-small'
  cancelBtn.textContent = 'Cancel'

  actionsRow.appendChild(confirmBtn)
  actionsRow.appendChild(cancelBtn)
  form.appendChild(titleInput)
  form.appendChild(descInput)
  form.appendChild(actionsRow)

  triggerBtn.parentNode?.insertBefore(form, triggerBtn)
  triggerBtn.style.display = 'none'
  titleInput.focus()

  const doAdd = () => {
    const title = titleInput.value.trim()
    if (!title) { titleInput.focus(); return }
    const desc = descInput.value.trim()
    state = {
      ...state,
      sections: addTask(state.sections, sectionIndex, { title, description: desc, done: false }),
    }
    renderState()
    scheduleSave()
  }

  const doCancel = () => {
    form.remove()
    triggerBtn.style.display = ''
  }

  confirmBtn.addEventListener('click', doAdd)
  cancelBtn.addEventListener('click', doCancel)
  titleInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); doAdd() }
    else if (e.key === 'Escape') { e.preventDefault(); doCancel() }
  })
  descInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); doCancel() }
  })
}

// --- Add Section (footer form) ---
function handleAddSection(): void {
  if (!newSectionNameInput) return
  const name = newSectionNameInput.value.trim()
  if (!name) return

  const newSections = addSectionFn(state.sections, name)
  if (newSections === state.sections) {
    newSectionNameInput.focus()
    return
  }
  state = { ...state, sections: newSections }
  newSectionNameInput.value = ''
  renderState()
  scheduleSave()
}

// --- File I/O ---
function loadFile(): void {
  if (!state.projectPath || typeof forja === 'undefined') {
    state = { ...state, sections: [], loading: false }
    renderState()
    return
  }

  state = { ...state, loading: true }
  renderState()

  forja.fs.readFile(FILENAME)
    .then(content => {
      state = {
        ...state,
        fileExists: true,
        sections: parseMarkdown(content ?? ''),
        loading: false,
      }
      renderState()
    })
    .catch(() => {
      state = { ...state, fileExists: false, sections: [], loading: false }
      renderState()
    })
}

function createTasksFile(): void {
  if (!state.projectPath || typeof forja === 'undefined') return
  const initialContent = '# TASKS.md\n'
  forja.fs.writeFile(FILENAME, initialContent)
    .then(() => {
      state = {
        ...state,
        fileExists: true,
        sections: parseMarkdown(initialContent),
      }
      renderState()
    })
    .catch(err => {
      console.error('Failed to create TASKS.md:', err)
    })
}

// --- Event listeners ---
if (createFileBtn) {
  createFileBtn.addEventListener('click', createTasksFile)
}

if (elements.reloadBtn) {
  elements.reloadBtn.addEventListener('click', () => {
    elements.reloadBtn.classList.add('spinning')
    loadFile()
    setTimeout(() => elements.reloadBtn.classList.remove('spinning'), 500)
  })
}

if (pluginTitleEl) {
  pluginTitleEl.addEventListener('click', () => {
    if (typeof forja === 'undefined' || !state.projectPath || !state.fileExists) return
    try {
      if (forja.editor?.open) {
        forja.editor.open(FILENAME, { preview: true })
      }
    } catch (err) {
      console.error('[Markdown Tasks] Failed to open preview:', err)
    }
  })
}

if (newSectionNameInput) {
  newSectionNameInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAddSection() }
  })
}

// --- Forja API Integration ---
if (typeof forja !== 'undefined') {
  forja.project.getActive()
    .then(project => {
      if (project?.path) {
        state = { ...state, projectPath: project.path, projectName: project.name ?? null }
        loadFile()
      } else {
        renderState()
      }
    })
    .catch(err => {
      console.error('[Markdown Tasks] getActive error:', err)
      renderState()
    })

  forja.on('project-changed', payload => {
    state = { ...state, projectPath: payload.path ?? null, projectName: payload.name ?? null }
    loadFile()
  })
} else {
  console.warn('[Markdown Tasks] forja API not available')
  renderState()
}
