import { describe, it, expect } from 'vitest'
import { parseMarkdown, toMarkdown } from '../parser'

describe('parseMarkdown', () => {
  it('parses empty string to array with one unsorted section', () => {
    const result = parseMarkdown('')
    expect(result).toHaveLength(1)
    expect(result[0].title).toBeNull()
    expect(result[0].tasks).toHaveLength(0)
  })

  it('parses a section header ## Title into a named section with empty tasks', () => {
    const result = parseMarkdown('## My Section')
    // first section is unsorted (null title), second is the named one
    const named = result.find(s => s.title === 'My Section')
    expect(named).toBeDefined()
    expect(named!.tasks).toHaveLength(0)
  })

  it('parses unchecked task - [ ] text', () => {
    const result = parseMarkdown('- [ ] Buy milk')
    expect(result[0].tasks).toHaveLength(1)
    expect(result[0].tasks[0].title).toBe('Buy milk')
    expect(result[0].tasks[0].done).toBe(false)
  })

  it('parses checked task - [x] text as done', () => {
    const result = parseMarkdown('- [x] Buy milk')
    expect(result[0].tasks[0].done).toBe(true)
  })

  it('parses checked task with uppercase X - [X] text as done', () => {
    const result = parseMarkdown('- [X] Buy milk')
    expect(result[0].tasks[0].done).toBe(true)
  })

  it('parses task description with > prefix into the last task', () => {
    const md = '- [ ] Write tests\n> Use vitest for testing'
    const result = parseMarkdown(md)
    expect(result[0].tasks[0].description).toBe('Use vitest for testing')
  })

  it('parses multiline description appending lines', () => {
    const md = '- [ ] Write tests\n> Line one\n> Line two'
    const result = parseMarkdown(md)
    expect(result[0].tasks[0].description).toBe('Line one\nLine two')
  })

  it('ignores description line when there are no tasks yet', () => {
    const md = '> orphan description\n- [ ] A task'
    const result = parseMarkdown(md)
    // The orphan description should not cause errors, task should still be parsed
    expect(result[0].tasks).toHaveLength(1)
    expect(result[0].tasks[0].title).toBe('A task')
  })

  it('parses multiple sections with their respective tasks', () => {
    const md = [
      '## Backlog',
      '- [ ] Task one',
      '- [x] Task two',
      '',
      '## In Progress',
      '- [ ] Task three',
    ].join('\n')

    const result = parseMarkdown(md)
    const backlog = result.find(s => s.title === 'Backlog')
    const inProgress = result.find(s => s.title === 'In Progress')

    expect(backlog).toBeDefined()
    expect(backlog!.tasks).toHaveLength(2)
    expect(inProgress).toBeDefined()
    expect(inProgress!.tasks).toHaveLength(1)
  })

  it('places tasks before any section header in the null-title unsorted section', () => {
    const md = '- [ ] Unsorted task\n## Named\n- [ ] Named task'
    const result = parseMarkdown(md)
    const unsorted = result.find(s => s.title === null)
    const named = result.find(s => s.title === 'Named')

    expect(unsorted).toBeDefined()
    expect(unsorted!.tasks[0].title).toBe('Unsorted task')
    expect(named!.tasks[0].title).toBe('Named task')
  })

  it('preserves task order within a section', () => {
    const md = [
      '## Work',
      '- [ ] First',
      '- [ ] Second',
      '- [ ] Third',
    ].join('\n')

    const result = parseMarkdown(md)
    const section = result.find(s => s.title === 'Work')!
    expect(section.tasks[0].title).toBe('First')
    expect(section.tasks[1].title).toBe('Second')
    expect(section.tasks[2].title).toBe('Third')
  })

  it('trims whitespace from section titles', () => {
    const result = parseMarkdown('##   Padded Title   ')
    const named = result.find(s => s.title === 'Padded Title')
    expect(named).toBeDefined()
  })

  it('trims whitespace from task titles', () => {
    const result = parseMarkdown('- [ ]   Padded Task   ')
    expect(result[0].tasks[0].title).toBe('Padded Task')
  })
})

describe('toMarkdown', () => {
  it('converts empty sections array to empty-like string (just the header)', () => {
    // With just one unsorted empty section, output should contain the header
    const result = toMarkdown([{ title: null, tasks: [] }])
    // Just the header line + newline
    expect(result.trim()).toBe('# TASKS.md')
  })

  it('converts a named section with tasks to correct markdown format', () => {
    const sections = [
      { title: null, tasks: [] },
      {
        title: 'Backlog',
        tasks: [
          { title: 'Task one', description: '', done: false },
          { title: 'Task two', description: '', done: true },
        ],
      },
    ]
    const result = toMarkdown(sections)
    expect(result).toContain('## Backlog')
    expect(result).toContain('- [ ] Task one')
    expect(result).toContain('- [x] Task two')
  })

  it('includes task descriptions with > prefix', () => {
    const sections = [
      {
        title: null,
        tasks: [
          { title: 'Write tests', description: 'Use vitest', done: false },
        ],
      },
    ]
    const result = toMarkdown(sections)
    expect(result).toContain('- [ ] Write tests')
    expect(result).toContain('  > Use vitest')
  })

  it('includes multiline descriptions with > prefix on each line', () => {
    const sections = [
      {
        title: null,
        tasks: [
          { title: 'Task', description: 'Line one\nLine two', done: false },
        ],
      },
    ]
    const result = toMarkdown(sections)
    expect(result).toContain('  > Line one')
    expect(result).toContain('  > Line two')
  })

  it('marks done tasks with [x]', () => {
    const sections = [
      {
        title: null,
        tasks: [{ title: 'Done task', description: '', done: true }],
      },
    ]
    const result = toMarkdown(sections)
    expect(result).toContain('- [x] Done task')
    expect(result).not.toContain('- [ ] Done task')
  })

  it('marks undone tasks with [ ]', () => {
    const sections = [
      {
        title: null,
        tasks: [{ title: 'Pending task', description: '', done: false }],
      },
    ]
    const result = toMarkdown(sections)
    expect(result).toContain('- [ ] Pending task')
    expect(result).not.toContain('- [x] Pending task')
  })

  it('does not output ## header for null-title sections', () => {
    const sections = [
      {
        title: null,
        tasks: [{ title: 'Unsorted', description: '', done: false }],
      },
    ]
    const result = toMarkdown(sections)
    // No ## header for null section
    expect(result).not.toMatch(/^##/m)
  })

  it('round-trips: parseMarkdown(toMarkdown(sections)) preserves data', () => {
    const original = [
      {
        title: null,
        tasks: [{ title: 'Free task', description: 'desc', done: false }],
      },
      {
        title: 'Sprint 1',
        tasks: [
          { title: 'Feature A', description: '', done: false },
          { title: 'Feature B', description: 'Some detail', done: true },
        ],
      },
    ]

    const md = toMarkdown(original)
    const parsed = parseMarkdown(md)

    const unsorted = parsed.find(s => s.title === null)!
    const sprint = parsed.find(s => s.title === 'Sprint 1')!

    expect(unsorted.tasks[0].title).toBe('Free task')
    expect(unsorted.tasks[0].description).toBe('desc')
    expect(unsorted.tasks[0].done).toBe(false)

    expect(sprint.tasks[0].title).toBe('Feature A')
    expect(sprint.tasks[1].title).toBe('Feature B')
    expect(sprint.tasks[1].description).toBe('Some detail')
    expect(sprint.tasks[1].done).toBe(true)
  })
})
