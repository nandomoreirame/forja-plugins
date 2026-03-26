/**
 * Registers a listener that is called whenever the Forja theme changes.
 * Requires the `forja` global to be available (runs inside Forja's PluginHost).
 *
 * @param callback - Function to call when the theme changes.
 */
export function onThemeChange(callback: () => void): void {
  if (typeof forja === 'undefined') return
  forja.on('theme-changed', callback)
}
