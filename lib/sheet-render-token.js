/**
 * Render generation counter per sheet.
 *
 * The lazy paths finish their work after paint (getChatData / enrichHTML for expanded rows,
 * biography enrich). A re-render that starts mid-flight replaces the DOM those continuations
 * were about to write to, so every continuation must check that its generation is still current.
 */

/** @param {foundry.applications.api.Application} app @returns {number} */
export function bumpRenderToken(app) {
	return (app._lazyRenderToken = (app._lazyRenderToken ?? 0) + 1);
}

/** @param {foundry.applications.api.Application} app @returns {number} */
export function currentRenderToken(app) {
	return app?._lazyRenderToken ?? 0;
}

/** @param {foundry.applications.api.Application} app @param {number} token */
export function isCurrentRender(app, token) {
	return Boolean(app?.rendered) && currentRenderToken(app) === token;
}

/**
 * Bump the generation before any other renderActorSheetV2 listener runs.
 * Register this first (see main.js).
 */
export function registerSheetRenderToken() {
	Hooks.on("renderActorSheetV2", (app) => {
		bumpRenderToken(app);
	});
}
