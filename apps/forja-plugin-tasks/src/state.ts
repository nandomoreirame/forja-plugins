import type { Section, Task, TasksState } from './types'

export function createInitialState(): TasksState {
  return {
    projectPath: null,
    projectName: null,
    sections: [],
    loading: false,
    fileExists: false,
  }
}

/**
 * Returns a deep clone of the sections array so that callers can verify
 * that all state functions are pure (no mutation of the input).
 */
function cloneSections(sections: Section[]): Section[] {
  return sections.map(s => ({
    title: s.title,
    tasks: s.tasks.map(t => ({ ...t })),
  }))
}

/**
 * Moves a task between sections or within the same section.
 * Pure function — does not mutate the input.
 *
 * fromSection / fromIndex: source location
 * toSection / toIndex: insert-before index at destination
 */
export function moveTask(
  sections: Section[],
  fromSection: number,
  fromIndex: number,
  toSection: number,
  toIndex: number,
): Section[] {
  // No-op guard: same position or one slot below in same section
  if (
    fromSection === toSection &&
    (fromIndex === toIndex || fromIndex + 1 === toIndex)
  ) {
    return cloneSections(sections)
  }

  const result = cloneSections(sections)
  const task = result[fromSection].tasks[fromIndex]

  // Remove from source
  result[fromSection].tasks.splice(fromIndex, 1)

  // Adjust destination index when moving within the same section and the
  // removal shifted subsequent indices by 1
  let adjustedToIndex = toIndex
  if (fromSection === toSection && toIndex > fromIndex) {
    adjustedToIndex--
  }

  // Insert at destination
  result[toSection].tasks.splice(adjustedToIndex, 0, task)

  return result
}

/**
 * Moves a whole section to a new position.
 * Pure function — does not mutate the input.
 *
 * toIndex is the insert-before index.
 */
export function moveSection(sections: Section[], fromIndex: number, toIndex: number): Section[] {
  // No-op guard
  if (fromIndex === toIndex || fromIndex + 1 === toIndex) {
    return cloneSections(sections)
  }

  const result = cloneSections(sections)
  const [section] = result.splice(fromIndex, 1)

  let adjustedToIndex = toIndex
  if (toIndex > fromIndex) {
    adjustedToIndex--
  }

  result.splice(adjustedToIndex, 0, section)
  return result
}

/**
 * Toggles the done state of a specific task.
 * Pure function — does not mutate the input.
 */
export function toggleTask(sections: Section[], sectionIndex: number, taskIndex: number): Section[] {
  const result = cloneSections(sections)
  result[sectionIndex].tasks[taskIndex].done = !result[sectionIndex].tasks[taskIndex].done
  return result
}

/**
 * Removes a task from a section. If the section is named (title !== null) and
 * becomes empty after the removal, the section itself is also removed.
 * Pure function — does not mutate the input.
 */
export function deleteTask(sections: Section[], sectionIndex: number, taskIndex: number): Section[] {
  const result = cloneSections(sections)
  result[sectionIndex].tasks.splice(taskIndex, 1)

  // Remove empty named sections
  if (result[sectionIndex].title !== null && result[sectionIndex].tasks.length === 0) {
    result.splice(sectionIndex, 1)
  }

  return result
}

/**
 * Appends a new task to the specified section.
 * Pure function — does not mutate the input.
 */
export function addTask(sections: Section[], sectionIndex: number, task: Task): Section[] {
  const result = cloneSections(sections)
  result[sectionIndex].tasks.push({ ...task })
  return result
}

/**
 * Appends a new named section.
 * Returns the original array (same reference) if the title already exists.
 * Pure function — does not mutate the input.
 */
export function addSection(sections: Section[], title: string): Section[] {
  const duplicate = sections.some(s => s.title === title)
  if (duplicate) return sections

  return [
    ...cloneSections(sections),
    { title, tasks: [] },
  ]
}

/**
 * Deletes a named section. If the section has tasks, they are moved to the
 * unsorted (title: null) section, creating it at the top if necessary.
 * Pure function — does not mutate the input.
 */
export function deleteSection(sections: Section[], sectionIndex: number): Section[] {
  const result = cloneSections(sections)
  const section = result[sectionIndex]

  if (section.tasks.length > 0) {
    let unsortedIndex = result.findIndex(s => s.title === null)

    if (unsortedIndex === -1) {
      // Create unsorted section at the top, then remove the target section
      // (which shifted by 1 due to the unshift)
      result.unshift({ title: null, tasks: [...section.tasks] })
      result.splice(sectionIndex + 1, 1)
    } else {
      // Move tasks to existing unsorted section, then remove target section
      result[unsortedIndex].tasks.push(...section.tasks)
      result.splice(sectionIndex, 1)
    }
  } else {
    result.splice(sectionIndex, 1)
  }

  return result
}
