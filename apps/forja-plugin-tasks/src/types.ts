export interface Task {
  title: string
  description: string
  done: boolean
}

export interface Section {
  title: string | null
  tasks: Task[]
}

export interface TasksState {
  projectPath: string | null
  projectName: string | null
  sections: Section[]
  loading: boolean
  fileExists: boolean
}

export interface DragState {
  active: boolean
  type: 'task' | 'section' | null
  fromSection: number
  fromIndex: number
}
