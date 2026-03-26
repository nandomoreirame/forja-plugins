// ============================================================
// Forja Plugin SDK — Type Definitions
// Based on usage observed across all official plugins:
//   - forja-plugin-clock
//   - forja-plugin-pomodoro
//   - forja-plugin-tasks
// ============================================================

export interface ForjaProject {
  /** Absolute path to the active project directory */
  path: string
  /** Human-readable project name */
  name: string | null
}

export interface ForjaTheme {
  /** Theme identifier (e.g. "dark", "light", "nord") */
  id: string
  /** Display name for the theme */
  name: string
  /** Whether this is a dark theme */
  isDark: boolean
}

export interface ForjaNotificationOptions {
  /** Notification title */
  title: string
  /** Notification body text */
  body: string
}

export interface ForjaProjectAPI {
  /** Returns the currently active project, or null if none is open */
  getActive(): Promise<ForjaProject | null>
}

export interface ForjaFsAPI {
  /** Reads a file relative to the active project root */
  readFile(path: string): Promise<string>
  /** Writes content to a file relative to the active project root */
  writeFile(path: string, content: string): Promise<void>
}

export interface ForjaThemeAPI {
  /** Returns the current theme data */
  getCurrent(): Promise<ForjaTheme>
}

export interface ForjaNotificationsAPI {
  /** Shows a desktop notification. Resolves when shown, rejects if permission denied. */
  show(options: ForjaNotificationOptions): Promise<void>
}

export interface ForjaSidebarAPI {
  /** Sets the badge text on the plugin's sidebar icon. Pass empty string to clear. */
  setBadge(text: string): void
}

export interface ForjaEditorAPI {
  /** Opens a file in the editor */
  open(path: string, options?: { preview?: boolean }): void
}

export type ForjaEventName = 'theme-changed' | 'project-changed'

export type ForjaEventPayload<T extends ForjaEventName> =
  T extends 'theme-changed' ? ForjaTheme :
  T extends 'project-changed' ? ForjaProject :
  never

export interface ForjaAPI {
  project: ForjaProjectAPI
  fs: ForjaFsAPI
  theme: ForjaThemeAPI
  notifications: ForjaNotificationsAPI
  sidebar: ForjaSidebarAPI
  editor?: ForjaEditorAPI
  on<T extends ForjaEventName>(event: T, callback: (payload: ForjaEventPayload<T>) => void): void
}

// Make `forja` available as a global in plugin code
declare global {
  // eslint-disable-next-line no-var
  var forja: ForjaAPI | undefined
}
