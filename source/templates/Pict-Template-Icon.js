const libPictTemplate = require('pict-template');

/**
 * Icon template tag — emits a themable SVG icon by PascalCase name.
 *
 *   {~Icon:Home~}              → default variant for 'Home'
 *   {~Icon:Folder:Filled~}     → explicit variant
 *   {~I:Spreadsheet~}          → short alias of {~Icon:~}
 *   {~I:File:Filled~}          → short + variant
 *
 * The plugin is a thin shim over the `Icon` provider — all the registry
 * + lookup + variant-fallback logic lives there.  See Provider-Icon.js
 * for registration, alias resolution, and per-name defaults.
 *
 * Sizing happens at the CSS layer: icons are wrapped in `<span class="pict-icon">`
 * whose inner svg is `1em × 1em`.  To resize, set `font-size` on the
 * parent (e.g. a button) — no template-side sizing needed for the common
 * case.  One-off sizing still works through the JS API:
 * `pict.icon('Save', { size: 20 })`.
 */
class PictTemplateProviderIcon extends libPictTemplate
{
	/**
	 * @param {Object} pFable - The Fable Framework instance
	 * @param {Object} pOptions - The options for the service
	 * @param {String} pServiceHash - The hash of the service
	 */
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.addPattern('{~Icon:', '~}');
		this.addPattern('{~I:',    '~}');
	}

	/**
	 * @param {string} pTemplateHash - Body of the tag (the bit between the
	 *                                  opening pattern and the closing `~}`).
	 *                                  Either "Name" or "Name:Variant".
	 * @returns {string}
	 */
	render(pTemplateHash)
	{
		let tmpBody = (pTemplateHash || '').trim();
		if (tmpBody.length < 1)
		{
			return '';
		}
		let tmpName = tmpBody;
		let tmpVariant = null;
		let tmpColon = tmpBody.indexOf(':');
		if (tmpColon > -1)
		{
			tmpName    = tmpBody.slice(0, tmpColon).trim();
			tmpVariant = tmpBody.slice(tmpColon + 1).trim();
		}

		let tmpProvider = this.pict && this.pict.providers && this.pict.providers.Icon;
		if (!tmpProvider || typeof (tmpProvider.get) !== 'function')
		{
			// Provider missing — should never happen in a normally-booted
			// Pict app, but degrade silently rather than emit something
			// that looks like a template tag.
			return '';
		}

		let tmpOpts = tmpVariant ? { variant: tmpVariant } : undefined;
		return tmpProvider.get(tmpName, tmpOpts);
	}
}

module.exports = PictTemplateProviderIcon;
