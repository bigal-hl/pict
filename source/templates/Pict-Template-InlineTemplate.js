const libPictTemplate = require('pict-template');

/**
 * Inline Template expression.
 *
 * Captures its raw contents (verbatim, including any other pict template
 * tags) and processes them as a template at runtime.  At render time the
 * captured string is fed back through `pict.parseTemplate(...)` with the
 * same Record/Context/Scope/State that was active at the outer scope.
 *
 *   {<TEMPLATED CONTENT HERE, {~D:AppData.SomeValue~}.>}
 *
 * Direct nesting of `{<...>}` inside another `{<...>}` is not supported;
 * the first `>}` closes the outer block.  Wrap the inner literal in a
 * registered template hash and reference it with `{~T:Hash~}` for that.
 */
class PictTemplateProviderInlineTemplate extends libPictTemplate
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

		this.addPattern('{<', '>}');
	}

	/**
	 * Render an inline template expression, returning a string with the
	 * processed template content.
	 *
	 * @param {string} pTemplateBody - The raw inline template body (what was between `{<` and `>}`)
	 * @param {any} pRecord - The json object to be used as the Record for the template render
	 * @param {Array<any>} pContextArray - An array of context objects accessible from the template; safe to leave empty
	 * @param {any} [pScope] - A sticky scope that can be used to carry state and simplify template
	 * @param {any} [pState] - A catchall state object for plumbing data through template processing.
	 *
	 * @return {string} The rendered template
	 */
	render(pTemplateBody, pRecord, pContextArray, pScope, pState)
	{
		let tmpBody = (typeof (pTemplateBody) === 'string') ? pTemplateBody : '';

		if (this.pict.LogNoisiness > 4)
		{
			this.log.trace(`PICT Template [fInlineTemplateRender]::[${tmpBody}] with tmpData:`, pRecord);
		}
		else if (this.pict.LogNoisiness > 0)
		{
			this.log.trace(`PICT Template [fInlineTemplateRender]::[${tmpBody}]`);
		}

		if (tmpBody.length < 1)
		{
			return '';
		}

		return this.pict.parseTemplate(tmpBody, pRecord, null, pContextArray, pScope, pState);
	}

	/**
	 * Render an inline template expression, delivering the result to a callback.
	 *
	 * @param {string} pTemplateBody - The raw inline template body (what was between `{<` and `>}`)
	 * @param {any} pRecord - The json object to be used as the Record for the template render
	 * @param {(error?: Error, content?: String) => void} fCallback - callback function invoked with the rendered template, or an error
	 * @param {Array<any>} pContextArray - An array of context objects accessible from the template; safe to leave empty
	 * @param {any} [pScope] - A sticky scope that can be used to carry state and simplify template
	 * @param {any} [pState] - A catchall state object for plumbing data through template processing.
	 *
	 * @return {void}
	 */
	renderAsync(pTemplateBody, pRecord, fCallback, pContextArray, pScope, pState)
	{
		let tmpBody = (typeof (pTemplateBody) === 'string') ? pTemplateBody : '';
		let tmpCallback = (typeof (fCallback) === 'function') ? fCallback : () => { return ''; };

		if (this.pict.LogNoisiness > 4)
		{
			this.log.trace(`PICT Template [fInlineTemplateRenderAsync]::[${tmpBody}] with tmpData:`, pRecord);
		}
		else if (this.pict.LogNoisiness > 0)
		{
			this.log.trace(`PICT Template [fInlineTemplateRenderAsync]::[${tmpBody}]`);
		}

		if (tmpBody.length < 1)
		{
			return tmpCallback(null, '');
		}

		this.pict.parseTemplate(tmpBody, pRecord,
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

module.exports = PictTemplateProviderInlineTemplate;
module.exports.template_hash = 'InlineTemplate';
