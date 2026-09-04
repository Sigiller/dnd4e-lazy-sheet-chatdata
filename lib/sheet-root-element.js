/**
 * Resolve a sheet's root element.
 *
 * The jQuery-era idiom `html?.[0] ?? html` is a trap on ApplicationV2: `html` is already an
 * HTMLElement, and for the sheet's `<form>` root, indexed access is HTMLFormElement's
 * *form-controls* collection — `form[0]` returns the first button, so every querySelector
 * afterwards silently matches nothing.
 *
 * Always test for HTMLElement first, and only then fall back to unwrapping a jQuery object.
 */

/**
 * @param {HTMLElement | { 0?: unknown } | null | undefined} candidate
 * @returns {HTMLElement | null}
 */
export function resolveElement(candidate) {
	if (candidate instanceof HTMLElement) return candidate;
	const first = candidate?.[0];
	return first instanceof HTMLElement ? first : null;
}

/**
 * Root element for a sheet render: the hook argument if usable, otherwise the app's own element.
 *
 * @param {foundry.applications.api.Application} app
 * @param {unknown} [html] the second argument of a render{Class} hook
 * @returns {HTMLElement | null}
 */
export function resolveSheetRoot(app, html) {
	return resolveElement(html) ?? resolveElement(app?.element);
}
