const libPictProvider = require('pict-provider');
const _BuiltInIcons   = require('./Pict-Icons-Base.js');

/**
 * Pict-Provider-Icon — the central icon registry.
 *
 * Every glyph is an SVG string with `currentColor`-driven paint, so icons
 * inherit text color from the surrounding context and re-skin automatically
 * when the active theme changes.  The provider also injects a small base
 * stylesheet so `font-size` on a parent scales icons natively — no SVG
 * width/height juggling.
 *
 * Public surface:
 *   pict.icon(name [, opts])                    convenience shortcut
 *   pict.providers.Icon.get(name [, opts])      same, via the provider
 *   pict.providers.Icon.has(name [, variant])
 *   pict.providers.Icon.register(name, svg [, opts])
 *   pict.providers.Icon.registerSet(byVariant)
 *
 * Template tag (registered by Pict-Template-Icon.js):
 *   {~Icon:Home~}              default variant
 *   {~Icon:Folder:Filled~}     explicit variant
 *   {~I:Spreadsheet~}          short alias
 *   {~I:File:Filled~}          short + variant
 *
 * Extension pattern — pict-section-* modules call `registerSet()` at boot
 * to plug in section-specific icons (file-type glyphs, language marks,
 * etc.) without forking core.
 *
 * Lookup order on miss:
 *   1. exact (name, variant)
 *   2. (name, defaultVariant) for that name
 *   3. (name, Outline) — the global default variant
 *   4. inline question-mark glyph + log warning; never throws
 */

const _DefaultProviderConfiguration =
{
	ProviderIdentifier: 'Pict-Provider-Icon',

	AutoInitialize: true,
	AutoInitializeOrdinal: 0,

	// Variant used when {~Icon:Name~} is asked for with no explicit
	// variant *and* no per-name default exists.
	DefaultVariant: 'Outline',

	// Default extra class applied to every emitted icon wrapper.  Apps
	// override per-call via opts.class.  Always also gets 'pict-icon'.
	DefaultIconClass: 'pict-icon',

	// Default font-size when caller passes { size: N }.  Icons sized via
	// `em` (1em x 1em on the inner <svg>) so font-size drives dimensions.
	DefaultSize: null,

	// Auto-register the bundled base icon set during construction.  Apps
	// that want a completely custom set can set this false and seed via
	// registerSet() after construction.
	RegisterBaseIcons: true
};

// PascalCase aliases — let consumers reach for the name they remember
// first.  Resolved at lookup time, so registering 'Settings' makes 'Gear'
// resolve to it automatically.  Kept short on purpose; expansive aliasing
// is the host's job, not core's.
const _Aliases =
{
	Gear:       'Settings',
	Cog:        'Settings',
	House:      'Home',
	X:          'Close',
	Cross:      'Close',
	Hamburger:  'Menu',
	Pencil:     'Edit',
	Bin:        'Trash',
	Magnifier:  'Search',
	Reload:     'Refresh',
	Person:     'User',
	Padlock:    'Lock'
};

// Minimal CSS — sizes the icon via the parent's font cascade, no SVG
// width/height baked in.  Themes recolor through currentColor; consumers
// can layer additional class rules on top.
const _ProviderCSS = (
	'.pict-icon { display: inline-flex; align-items: center; justify-content: center; vertical-align: -0.125em; flex-shrink: 0; line-height: 0; color: inherit; }' +
	'.pict-icon > svg { width: 1em; height: 1em; display: block; }'
);

// Inline fallback emitted when a requested icon is missing entirely.
// Visible (not invisible) so the misconfiguration is obvious in the UI
// the first time it surfaces.
const _MissingGlyph = (
	'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
	'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
	'<circle cx="12" cy="12" r="10"/>' +
	'<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>' +
	'<line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
);

class PictProviderIcon extends libPictProvider
{
	constructor(pFable, pOptions, pServiceHash)
	{
		let tmpOptions = Object.assign({}, _DefaultProviderConfiguration, pOptions);
		super(pFable, tmpOptions, pServiceHash);

		/** @type {Record<string, any>} */
		this.options;
		/** @type {import('../Pict.js')} */
		this.pict;

		// Registry shape:  { [variant]: { [name]: svgString } }
		this._registry = {};

		// Per-name default variant.  Set by the first register() call for
		// that name unless a later call passes { default: true }.
		this._defaultsByName = {};

		// Register base icons (Outline + Filled) before anyone can ask
		// for them.
		if (this.options.RegisterBaseIcons)
		{
			this.registerSet(_BuiltInIcons);
		}

		// Inject the base stylesheet.  CSSMap dedupes by hash so this is
		// safe even if multiple Pict instances register their own Icon
		// providers (single-tenant in browsers, but worth honoring).
		if (this.pict && this.pict.CSSMap && typeof (this.pict.CSSMap.addCSS) === 'function')
		{
			this.pict.CSSMap.addCSS('Pict-Provider-Icon-CSS', _ProviderCSS, 100);
		}
	}

	/**
	 * Register a single glyph.  First call for a (name) sets the default
	 * variant for that name unless an explicit variant is passed; subsequent
	 * calls add more variants without changing the default.
	 *
	 * @param {string} pName    PascalCase icon name (e.g. 'FileFolder')
	 * @param {string} pSvg     Full <svg>...</svg> string (no width/height)
	 * @param {object} [pOpts]  { variant: 'Outline'|'Filled'|... , default: bool, force: bool }
	 * @returns {boolean}       true on success, false if a (name, variant)
	 *                           already exists and { force: true } wasn't set.
	 */
	register(pName, pSvg, pOpts)
	{
		if (typeof (pName) !== 'string' || pName.length < 1)
		{
			this.log.warn('Pict-Provider-Icon.register requires a non-empty name.');
			return false;
		}
		if (typeof (pSvg) !== 'string' || pSvg.indexOf('<svg') < 0)
		{
			this.log.warn('Pict-Provider-Icon.register requires an SVG string for [' + pName + '].');
			return false;
		}

		let tmpOpts = pOpts || {};
		let tmpVariant = tmpOpts.variant || this.options.DefaultVariant;
		let tmpForce   = !!tmpOpts.force;
		let tmpDefault = !!tmpOpts.default;

		if (!this._registry[tmpVariant])
		{
			this._registry[tmpVariant] = {};
		}
		if (this._registry[tmpVariant][pName] && !tmpForce)
		{
			this.log.warn('Pict-Provider-Icon: refusing to overwrite [' + pName + ':' + tmpVariant
				+ '] (pass { force: true } to replace).');
			return false;
		}
		this._registry[tmpVariant][pName] = pSvg;

		// First registration for this name → it becomes the default,
		// regardless of which variant it was registered under.  This is
		// what "default is first registered" means in practice.
		if (!this._defaultsByName[pName] || tmpDefault)
		{
			this._defaultsByName[pName] = tmpVariant;
		}
		return true;
	}

	/**
	 * Bulk register a whole icon set, keyed by variant.
	 *
	 *   registerSet({ Outline: { Home: '<svg/>', Folder: '<svg/>' },
	 *                 Filled:  { Home: '<svg/>' } });
	 *
	 * Per-name defaults follow registration order — the first variant
	 * containing a given name becomes that name's default.
	 *
	 * @param {Record<string, Record<string, string>>} pByVariant
	 * @param {object} [pOpts] { force: bool }
	 */
	registerSet(pByVariant, pOpts)
	{
		if (!pByVariant || typeof (pByVariant) !== 'object')
		{
			return;
		}
		let tmpForce = !!(pOpts && pOpts.force);
		let tmpVariants = Object.keys(pByVariant);
		for (let v = 0; v < tmpVariants.length; v++)
		{
			let tmpVariant = tmpVariants[v];
			let tmpIcons = pByVariant[tmpVariant];
			if (!tmpIcons) continue;
			let tmpNames = Object.keys(tmpIcons);
			for (let n = 0; n < tmpNames.length; n++)
			{
				let tmpName = tmpNames[n];
				this.register(tmpName, tmpIcons[tmpName], { variant: tmpVariant, force: tmpForce });
			}
		}
	}

	/**
	 * @param {string} pName
	 * @param {string} [pVariant]
	 * @returns {boolean}
	 */
	has(pName, pVariant)
	{
		let tmpResolved = _Aliases[pName] || pName;
		if (pVariant)
		{
			return !!(this._registry[pVariant] && this._registry[pVariant][tmpResolved]);
		}
		return !!this._defaultsByName[tmpResolved];
	}

	/**
	 * Return the wrapped icon HTML for `pName`.  Always returns a string
	 * — never throws and never returns undefined, so it's safe to embed
	 * in template output unchecked.
	 *
	 * @param {string} pName     PascalCase icon name, or an alias
	 * @param {object} [pOpts]   { variant, size, class, ariaLabel }
	 * @returns {string}
	 */
	get(pName, pOpts)
	{
		let tmpName = (typeof (pName) === 'string') ? pName.trim() : '';
		if (tmpName.length < 1)
		{
			this.log.warn('Pict-Provider-Icon.get called with empty name.');
			return this._wrap(_MissingGlyph, pOpts);
		}
		// Alias resolution — Gear → Settings, etc.
		let tmpResolved = _Aliases[tmpName] || tmpName;
		let tmpOpts = pOpts || {};
		let tmpRequestedVariant = tmpOpts.variant;

		// 1. exact match for explicitly-requested variant
		if (tmpRequestedVariant && this._registry[tmpRequestedVariant] && this._registry[tmpRequestedVariant][tmpResolved])
		{
			return this._wrap(this._registry[tmpRequestedVariant][tmpResolved], tmpOpts);
		}
		// 2. per-name default variant
		let tmpNameDefault = this._defaultsByName[tmpResolved];
		if (tmpNameDefault && this._registry[tmpNameDefault] && this._registry[tmpNameDefault][tmpResolved])
		{
			if (tmpRequestedVariant)
			{
				// Fell back from a requested-but-missing variant — log so
				// the gap is visible in dev, but still emit a glyph.
				this.log.trace('Pict-Provider-Icon: variant [' + tmpRequestedVariant + '] missing for ['
					+ tmpResolved + '], using [' + tmpNameDefault + '].');
			}
			return this._wrap(this._registry[tmpNameDefault][tmpResolved], tmpOpts);
		}
		// 3. global default variant
		let tmpGlobal = this.options.DefaultVariant;
		if (this._registry[tmpGlobal] && this._registry[tmpGlobal][tmpResolved])
		{
			return this._wrap(this._registry[tmpGlobal][tmpResolved], tmpOpts);
		}
		// 4. missing — show a question-mark glyph so the gap surfaces
		this.log.warn('Pict-Provider-Icon: unknown icon [' + tmpName + ']'
			+ (tmpRequestedVariant ? ' (variant ' + tmpRequestedVariant + ')' : '') + '.');
		return this._wrap(_MissingGlyph, tmpOpts);
	}

	/**
	 * @private
	 * @param {string} pSvg
	 * @param {object} [pOpts] { size, class, ariaLabel }
	 * @returns {string}
	 */
	_wrap(pSvg, pOpts)
	{
		let tmpOpts = pOpts || {};
		let tmpClass = this.options.DefaultIconClass;
		if (typeof (tmpOpts.class) === 'string' && tmpOpts.class.length > 0)
		{
			tmpClass += ' ' + tmpOpts.class;
		}
		let tmpStyle = '';
		if (typeof (tmpOpts.size) === 'number' && tmpOpts.size > 0)
		{
			tmpStyle = ' style="font-size:' + tmpOpts.size + 'px"';
		}
		else if (typeof (tmpOpts.size) === 'string' && tmpOpts.size.length > 0)
		{
			tmpStyle = ' style="font-size:' + tmpOpts.size + '"';
		}
		// aria-hidden default true — most icons are decorative.  Caller
		// passes ariaLabel to attach a label and flip aria-hidden off.
		let tmpAria = ' aria-hidden="true"';
		if (typeof (tmpOpts.ariaLabel) === 'string' && tmpOpts.ariaLabel.length > 0)
		{
			tmpAria = ' role="img" aria-label="' + tmpOpts.ariaLabel.replace(/"/g, '&quot;') + '"';
		}
		return '<span class="' + tmpClass + '"' + tmpStyle + tmpAria + '>' + pSvg + '</span>';
	}
}

module.exports = PictProviderIcon;
module.exports.default_configuration = _DefaultProviderConfiguration;
