import type { Section } from './types'

/**
 * Parses a TASKS.md markdown string into an array of sections.
 *
 * The first element is always an unsorted section (title: null) for tasks
 * that appear before any ## heading. Named sections are appended as they
 * are encountered.
 */
export function parseMarkdown(text: string): Section[] {
  const lines = text.split('\n')
  const sections: Section[] = []
  let current: Section = { title: null, tasks: [] }
  sections.push(current)

  for (const line of lines) {
    const trimmed = line.trim()

    // Section header: ## Title
    const sectionMatch = trimmed.match(/^##\s+(.+)$/)
    if (sectionMatch) {
      current = { title: sectionMatch[1].trim(), tasks: [] }
      sections.push(current)
      continue
    }

    // Task: - [ ] or - [x] / - [X]
    const taskMatch = trimmed.match(/^-\s+\[([ xX])\]\s+(.+)$/)
    if (taskMatch) {
      current.tasks.push({
        title: taskMatch[2].trim(),
        description: '',
        done: taskMatch[1] !== ' ',
      })
      continue
    }

    // Description: > text (belongs to last task in current section)
    const descMatch = trimmed.match(/^>\s*(.*)$/)
    if (descMatch && current.tasks.length > 0) {
      const lastTask = current.tasks[current.tasks.length - 1]
      if (lastTask.description) {
        lastTask.description += '\n' + descMatch[1]
      } else {
        lastTask.description = descMatch[1]
      }
    }
  }

  return sections
}

/**
 * Serializes an array of sections back to TASKS.md markdown format.
 */
export function toMarkdown(sections: Section[]): string {
  const lines: string[] = ['# TASKS.md', '']

  for (const section of sections) {
    if (section.title) {
      lines.push('## ' + section.title)
      lines.push('')
    }

    for (const task of section.tasks) {
      const checkbox = task.done ? '[x]' : '[ ]'
      lines.push('- ' + checkbox + ' ' + task.title)
      if (task.description) {
        const descLines = task.description.split('\n')
        for (const dl of descLines) {
          lines.push('  > ' + dl)
        }
      }
      lines.push('')
    }
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}
