const libPictTemplate = require('pict-template');

/**
 * Function template expression.
 *
 *   {~Function:Pict.providers.SomeProvider.makeThing:Record.X:Record.Y~}
 *   {~F:Pict.providers.SomeProvider.makeThing:Record.X:Record.Y~}
 *
 * First parameter is the address of a function to call (resolved with
 * `pict.resolveStateFromAddress` against the usual root: Record, AppData,
 * Pict, Bundle, Context, Scope, TempData, __State).  Each subsequent
 * `:`-separated parameter is itself an address whose resolved value is
 * passed as an argument to the function.  Arity is dynamic.
 *
 * Returns whatever the function returns (coerced to '' when null /
 * undefined).  If the address does not resolve to a function, a warning is
 * logged that names the address and the full template expression, and the
 * expression renders as ''.  If the function throws, the error is logged
 * and the expression renders as ''.
 *
 * `this` is bound to the address's parent object so instance methods work
 * naturally:  `Pict.providers.X.go(...)` invokes with `this === Pict.providers.X`.
 */
class PictTemplateProviderFunction extends libPictTemplate
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

		this.addPattern('{~Function:', '~}');
		this.addPattern('{~F:', '~}');
	}

	/**
	 * Render the Function expression: call the resolved function with the
	 * resolved arguments and return its result.
	 *
	 * @param {string} pTemplateHash - The hash contents of the template (what's between the template start and stop tags)
	 * @param {any} pRecord - The json object to be used as the Record for the template render
	 * @param {Array<any>} pContextArray - An array of context objects accessible from the template; safe to leave empty
	 * @param {any} [pScope] - A sticky scope that can be used to carry state and simplify template
	 * @param {any} [pState] - A catchall state object for plumbing data through template processing.
	 *
	 * @return {string} The function's return value, stringified by the template engine; '' if the function is missing or throws.
	 */
	render(pTemplateHash, pRecord, pContextArray, pScope, pState)
	{
		let tmpHash = pTemplateHash.trim();
		let tmpRecord = (typeof (pRecord) === 'object') ? pRecord : {};

		if (this.pict.LogNoisiness > 4)
		{
			this.log.trace(`PICT Template [fFunctionRender]::[${tmpHash}] with tmpData:`, tmpRecord);
		}
		else if (this.pict.LogNoisiness > 0)
		{
			this.log.trace(`PICT Template [fFunctionRender]::[${tmpHash}]`);
		}

		let tmpParts = tmpHash.split(':');
		let tmpFunctionAddress = (tmpParts.length > 0) ? tmpParts[0].trim() : '';

		if (tmpFunctionAddress.length < 1)
		{
			this.log.warn(`Pict: Function Render: No function address provided in template [{~Function:${tmpHash}~}]`);
			return '';
		}

		let tmpFunction = this.resolveStateFromAddress(tmpFunctionAddress, tmpRecord, pContextArray, null, pScope, pState);

		if (typeof (tmpFunction) !== 'function')
		{
			this.log.warn(`Pict: Function Render: Function not found at address [${tmpFunctionAddress}] for template [{~Function:${tmpHash}~}]`);
			return '';
		}

		// Resolve `this` to the function's parent so instance methods bind naturally.
		let tmpThis = null;
		let tmpLastDot = tmpFunctionAddress.lastIndexOf('.');
		if (tmpLastDot > 0)
		{
			let tmpParentAddress = tmpFunctionAddress.substring(0, tmpLastDot);
			tmpThis = this.resolveStateFromAddress(tmpParentAddress, tmpRecord, pContextArray, null, pScope, pState);
		}

		let tmpArguments = [];
		for (let i = 1; i < tmpParts.length; i++)
		{
			tmpArguments.push(this.resolveStateFromAddress(tmpParts[i], tmpRecord, pContextArray, null, pScope, pState));
		}

		try
		{
			let tmpResult = tmpFunction.apply(tmpThis, tmpArguments);
			if (tmpResult == null)
			{
				return '';
			}
			return tmpResult;
		}
		catch (pError)
		{
			this.log.warn(`Pict: Function Render: Error invoking function at [${tmpFunctionAddress}] for template [{~Function:${tmpHash}~}]: ${pError.message}`);
			return '';
		}
	}
}

module.exports = PictTemplateProviderFunction;
module.exports.template_hash = 'Function';
