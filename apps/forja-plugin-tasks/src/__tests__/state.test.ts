import { describe, it, expect } from 'vitest'
import {
  createInitialState,
  moveTask,
  moveSection,
  toggleTask,
  deleteTask,
  addTask,
  deleteSection,
  addSection,
} from '../state'
import type { Section, Task } from '../types'

// --- Helpers ---

function makeTask(title: string, done = false, description = ''): Task {
  return { title, description, done }
}

function makeSections(...groups: [string | null, Task[]][]): Section[] {
  return groups.map(([title, tasks]) => ({ title, tasks }))
}

// --- createInitialState ---

describe('createInitialState', () => {
  it('returns state with null project info, empty sections, not loading, no file', () => {
    const state = createInitialState()
    expect(state.projectPath).toBeNull()
    expect(state.projectName).toBeNull()
    expect(state.sections).toHaveLength(0)
    expect(state.loading).toBe(false)
    expect(state.fileExists).toBe(false)
  })
})

// --- moveTask ---

describe('moveTask', () => {
  it('moves a task from one section to another', () => {
    const sections = makeSections(
      ['Backlog', [makeTask('Task A'), makeTask('Task B')]],
      ['Done', [makeTask('Task C')]],
    )

    const result = moveTask(sections, 0, 0, 1, 1)
    expect(result[0].tasks).toHaveLength(1)
    expect(result[0].tasks[0].title).toBe('Task B')
    expect(result[1].tasks).toHaveLength(2)
    expect(result[1].tasks[1].title).toBe('Task A')
  })

  it('moves a task within the same section', () => {
    const sections = makeSections(
      ['Work', [makeTask('First'), makeTask('Second'), makeTask('Third')]],
    )

    // Move 'First' (index 0) to after 'Third' (insertIndex 3)
    const result = moveTask(sections, 0, 0, 0, 3)
    expect(result[0].tasks[0].title).toBe('Second')
    expect(result[0].tasks[1].title).toBe('Third')
    expect(result[0].tasks[2].title).toBe('First')
  })

  it('is a no-op when dropped at same position (fromIndex === toIndex)', () => {
    const sections = makeSections(
      ['Work', [makeTask('A'), makeTask('B')]],
    )
    const result = moveTask(sections, 0, 0, 0, 0)
    expect(result[0].tasks[0].title).toBe('A')
    expect(result[0].tasks[1].title).toBe('B')
  })

  it('is a no-op when dropped one position below (fromIndex + 1 === toIndex, same section)', () => {
    const sections = makeSections(
      ['Work', [makeTask('A'), makeTask('B')]],
    )
    const result = moveTask(sections, 0, 0, 0, 1)
    expect(result[0].tasks[0].title).toBe('A')
    expect(result[0].tasks[1].title).toBe('B')
  })

  it('does not mutate the original sections array', () => {
    const sections = makeSections(
      ['S1', [makeTask('X'), makeTask('Y')]],
      ['S2', []],
    )
    const original = JSON.stringify(sections)
    moveTask(sections, 0, 0, 1, 0)
    expect(JSON.stringify(sections)).toBe(original)
  })
})

// --- moveSection ---

describe('moveSection', () => {
  it('moves a section to a new position', () => {
    const sections = makeSections(
      ['A', []],
      ['B', []],
      ['C', []],
    )
    // Move section 0 (A) to after C (insertIndex 3)
    const result = moveSection(sections, 0, 3)
    expect(result[0].title).toBe('B')
    expect(result[1].title).toBe('C')
    expect(result[2].title).toBe('A')
  })

  it('is a no-op when fromIndex === toIndex', () => {
    const sections = makeSections(['A', []], ['B', []])
    const result = moveSection(sections, 1, 1)
    expect(result[0].title).toBe('A')
    expect(result[1].title).toBe('B')
  })

  it('is a no-op when fromIndex + 1 === toIndex', () => {
    const sections = makeSections(['A', []], ['B', []])
    const result = moveSection(sections, 0, 1)
    expect(result[0].title).toBe('A')
    expect(result[1].title).toBe('B')
  })

  it('does not mutate the original sections array', () => {
    const sections = makeSections(['A', []], ['B', []], ['C', []])
    const original = JSON.stringify(sections)
    moveSection(sections, 0, 2)
    expect(JSON.stringify(sections)).toBe(original)
  })
})

// --- toggleTask ---

describe('toggleTask', () => {
  it('toggles an undone task to done', () => {
    const sections = makeSections(['S', [makeTask('Task', false)]])
    const result = toggleTask(sections, 0, 0)
    expect(result[0].tasks[0].done).toBe(true)
  })

  it('toggles a done task back to undone', () => {
    const sections = makeSections(['S', [makeTask('Task', true)]])
    const result = toggleTask(sections, 0, 0)
    expect(result[0].tasks[0].done).toBe(false)
  })

  it('only toggles the specified task, not others', () => {
    const sections = makeSections(['S', [
      makeTask('Task A', false),
      makeTask('Task B', false),
    ]])
    const result = toggleTask(sections, 0, 0)
    expect(result[0].tasks[0].done).toBe(true)
    expect(result[0].tasks[1].done).toBe(false)
  })

  it('does not mutate the original sections array', () => {
    const sections = makeSections(['S', [makeTask('Task', false)]])
    const original = JSON.stringify(sections)
    toggleTask(sections, 0, 0)
    expect(JSON.stringify(sections)).toBe(original)
  })
})

// --- deleteTask ---

describe('deleteTask', () => {
  it('removes the specified task from a section', () => {
    const sections = makeSections(['S', [makeTask('A'), makeTask('B'), makeTask('C')]])
    const result = deleteTask(sections, 0, 1) // remove 'B'
    expect(result[0].tasks).toHaveLength(2)
    expect(result[0].tasks.map(t => t.title)).toEqual(['A', 'C'])
  })

  it('removes an empty named section after deleting its last task', () => {
    const sections = makeSections(
      [null, []],
      ['Sprint', [makeTask('Only task')]],
    )
    const result = deleteTask(sections, 1, 0)
    expect(result.find(s => s.title === 'Sprint')).toBeUndefined()
  })

  it('does NOT remove the null-title unsorted section even when it becomes empty', () => {
    const sections = makeSections([null, [makeTask('Task')]])
    const result = deleteTask(sections, 0, 0)
    const unsorted = result.find(s => s.title === null)
    expect(unsorted).toBeDefined()
    expect(unsorted!.tasks).toHaveLength(0)
  })

  it('does not mutate the original sections', () => {
    const sections = makeSections(['S', [makeTask('A'), makeTask('B')]])
    const original = JSON.stringify(sections)
    deleteTask(sections, 0, 0)
    expect(JSON.stringify(sections)).toBe(original)
  })
})

// --- addTask ---

describe('addTask', () => {
  it('adds a new task to the specified section', () => {
    const sections = makeSections([null, []])
    const newTask = makeTask('New task')
    const result = addTask(sections, 0, newTask)
    expect(result[0].tasks).toHaveLength(1)
    expect(result[0].tasks[0].title).toBe('New task')
  })

  it('appends task at the end of existing tasks', () => {
    const sections = makeSections([null, [makeTask('Existing')]])
    const result = addTask(sections, 0, makeTask('New'))
    expect(result[0].tasks[1].title).toBe('New')
  })

  it('does not mutate original sections', () => {
    const sections = makeSections([null, []])
    const original = JSON.stringify(sections)
    addTask(sections, 0, makeTask('New'))
    expect(JSON.stringify(sections)).toBe(original)
  })
})

// --- addSection ---

describe('addSection', () => {
  it('creates a new named section', () => {
    const sections = makeSections([null, []])
    const result = addSection(sections, 'New Section')
    expect(result.find(s => s.title === 'New Section')).toBeDefined()
  })

  it('new section starts with empty tasks', () => {
    const sections = makeSections([null, []])
    const result = addSection(sections, 'Sprint 1')
    const newSection = result.find(s => s.title === 'Sprint 1')!
    expect(newSection.tasks).toHaveLength(0)
  })

  it('rejects duplicate section titles - returns original unchanged', () => {
    const sections = makeSections([null, []], ['Existing', []])
    const result = addSection(sections, 'Existing')
    expect(result).toBe(sections) // same reference = no change
  })

  it('does not mutate original sections when adding new section', () => {
    const sections = makeSections([null, []])
    const original = JSON.stringify(sections)
    addSection(sections, 'New')
    expect(JSON.stringify(sections)).toBe(original)
  })
})

// --- deleteSection ---

describe('deleteSection', () => {
  it('removes an empty named section', () => {
    const sections = makeSections([null, []], ['Sprint', []])
    const result = deleteSection(sections, 1)
    expect(result.find(s => s.title === 'Sprint')).toBeUndefined()
  })

  it('moves orphaned tasks to unsorted section when deleting a section with tasks', () => {
    const sections = makeSections(
      [null, [makeTask('Unsorted')]],
      ['Sprint', [makeTask('Orphan A'), makeTask('Orphan B')]],
    )
    const result = deleteSection(sections, 1)
    const unsorted = result.find(s => s.title === null)!
    expect(unsorted.tasks).toHaveLength(3) // 1 original + 2 orphans
    expect(unsorted.tasks.map(t => t.title)).toContain('Orphan A')
    expect(unsorted.tasks.map(t => t.title)).toContain('Orphan B')
  })

  it('creates an unsorted section if none exists when moving orphans', () => {
    const sections = makeSections(
      ['Sprint', [makeTask('Orphan')]],
    )
    const result = deleteSection(sections, 0)
    const unsorted = result.find(s => s.title === null)!
    expect(unsorted).toBeDefined()
    expect(unsorted.tasks[0].title).toBe('Orphan')
  })

  it('section is removed after moving its tasks to unsorted', () => {
    const sections = makeSections(
      [null, []],
      ['Sprint', [makeTask('Task')]],
    )
    const result = deleteSection(sections, 1)
    expect(result.find(s => s.title === 'Sprint')).toBeUndefined()
  })

  it('does not mutate original sections', () => {
    const sections = makeSections([null, []], ['Sprint', []])
    const original = JSON.stringify(sections)
    deleteSection(sections, 1)
    expect(JSON.stringify(sections)).toBe(original)
  })
})
