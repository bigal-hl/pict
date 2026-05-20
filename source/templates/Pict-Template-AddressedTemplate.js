const libPictTemplate = require('pict-template');

/**
 * Addressed Template expression.
 *
 *   {[AppData.MyTemplate]}
 *
 * Looks up the value at the given address (resolved through the same
 * scope as {~D:~} -- Record, AppData, Pict, Bundle, Context, Scope,
 * TempData, __State) and renders it as a template against the current
 * Record/Context/Scope/State.  Pairs with the inline template `{<...>}`:
 *
 *   {<inline body, parsed at runtime>}
 *   {[AppData.PathToTemplateString]}     <- body is *stored* at the address
 *
 * If the address does not resolve, or resolves to a non-string, a warning
 * is logged that names the address and the full expression, and the
 * expression renders as ''.
 */
class PictTemplateProviderAddressedTemplate extends libPictTemplate
{
	/**
	 * @param {Object} pFable - The Fable Framework instance
	 * @param {Object} pOptions - The options for the service
	 * @param {String} pServiceHash - The hash of the service
	 */
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		/** @type {any} */
		this.log;

		this.addPattern('{[', ']}');
	}

	/**
	 * Render the addressed template: resolve the address to a template
	 * string and parse it against the current scope.
	 *
	 * @param {string} pTemplateHash - The address (what's between `{[` and `]}`)
	 * @param {any} pRecord - The json object to be used as the Record for the template render
	 * @param {Array<any>} pContextArray - An array of context objects accessible from the template; safe to leave empty
	 * @param {any} [pScope] - A sticky scope that can be used to carry state and simplify template
	 * @param {any} [pState] - A catchall state object for plumbing data through template processing.
	 *
	 * @return {string} The rendered template, or '' when the address can't be resolved to a string.
	 */
	render(pTemplateHash, pRecord, pContextArray, pScope, pState)
	{
		let tmpAddress = pTemplateHash.trim();
		let tmpRecord = (typeof (pRecord) === 'object') ? pRecord : {};

		if (this.pict.LogNoisiness > 4)
		{
			this.log.trace(`PICT Template [fAddressedTemplateRender]::[${tmpAddress}] with tmpData:`, tmpRecord);
		}
		else if (this.pict.LogNoisiness > 0)
		{
			this.log.trace(`PICT Template [fAddressedTemplateRender]::[${tmpAddress}]`);
		}

		if (tmpAddress.length < 1)
		{
			this.log.warn(`Pict: Addressed Template Render: No address provided in expression [{[${pTemplateHash}]}]`);
			return '';
		}

		let tmpTemplate = this.resolveStateFromAddress(tmpAddress, tmpRecord, pContextArray, null, pScope, pState);

		if (tmpTemplate == null)
		{
			this.log.warn(`Pict: Addressed Template Render: Address [${tmpAddress}] did not resolve for expression [{[${pTemplateHash}]}]`);
			return '';
		}

		if (typeof (tmpTemplate) !== 'string')
		{
			this.log.warn(`Pict: Addressed Template Render: Address [${tmpAddress}] resolved to a non-string (${typeof tmpTemplate}) for expression [{[${pTemplateHash}]}]`);
			return '';
		}

		if (tmpTemplate.length < 1)
		{
			return '';
		}

		return this.pict.parseTemplate(tmpTemplate, pRecord, null, pContextArray, pScope, pState);
	}

	/**
	 * Render the addressed template asynchronously.
	 *
	 * @param {string} pTemplateHash - The address (what's between `{[` and `]}`)
	 * @param {any} pRecord - The json object to be used as the Record for the template render
	 * @param {(error?: Error, content?: String) => void} fCallback - callback function invoked with the rendered template, or an error
	 * @param {Array<any>} pContextArray - An array of context objects accessible from the template; safe to leave empty
	 * @param {any} [pScope] - A sticky scope that can be used to carry state and simplify template
	 * @param {any} [pState] - A catchall state object for plumbing data through template processing.
	 *
	 * @return {void}
	 */
	renderAsync(pTemplateHash, pRecord, fCallback, pContextArray, pScope, pState)
	{
		let tmpAddress = pTemplateHash.trim();
		let tmpRecord = (typeof (pRecord) === 'object') ? pRecord : {};
		let tmpCallback = (typeof (fCallback) === 'function') ? fCallback : () => { return ''; };

		if (this.pict.LogNoisiness > 4)
		{
			this.log.trace(`PICT Template [fAddressedTemplateRenderAsync]::[${tmpAddress}] with tmpData:`, tmpRecord);
		}
		else if (this.pict.LogNoisiness > 0)
		{
			this.log.trace(`PICT Template [fAddressedTemplateRenderAsync]::[${tmpAddress}]`);
		}

		if (tmpAddress.length < 1)
		{
			this.log.warn(`Pict: Addressed Template Render: No address provided in expression [{[${pTemplateHash}]}]`);
			return tmpCallback(null, '');
		}

		let tmpTemplate = this.resolveStateFromAddress(tmpAddress, tmpRecord, pContextArray, null, pScope, pState);

		if (tmpTemplate == null)
		{
			this.log.warn(`Pict: Addressed Template Render: Address [${tmpAddress}] did not resolve for expression [{[${pTemplateHash}]}]`);
			return tmpCallback(null, '');
		}

		if (typeof (tmpTemplate) !== 'string')
		{
			this.log.warn(`Pict: Addressed Template Render: Address [${tmpAddress}] resolved to a non-string (${typeof tmpTemplate}) for expression [{[${pTemplateHash}]}]`);
			return tmpCallback(null, '');
		}

		if (tmpTemplate.length < 1)
		{
			return tmpCallback(null, '');
		}

		this.pict.parseTemplate(tmpTemplate, pRecord,
			(pError, pValue) =>
			{
				if (pError)
				{
					return tmpCallback(pError, '');
				}
				return tmpCallback(null, pValue);
			}, pContextArray, pScope, pState);
	}
}

module.exports = PictTemplateProviderAddressedTemplate;
module.exports.template_hash = 'AddressedTemplate';
