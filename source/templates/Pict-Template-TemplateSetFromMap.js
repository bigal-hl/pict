const libPictTemplate = require('../Pict-Template.js');

class PictTemplateProviderTemplateSetFromMap extends libPictTemplate
{
	/**
	 * @param {Object} pFable - The Fable Framework instance
	 * @param {Object} pOptions - The options for the service
	 * @param {String} pServiceHash - The hash of the service
	 */
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.addPattern('{~TSFM:', '~}');
		this.addPattern('{~TemplateSetFromMap:', '~}');
	}

	render(pHash, pData, pContextArray)
	{
		let tmpHash = pHash.trim();
		let tmpData = (typeof (pData) === 'object') ? pData : {};

		if (this.LogNoisiness > 4)
		{
			this.log.trace(`PICT TemplateFromMap [fTemplateFromMapSetRender]::[${tmpHash}] with tmpData:`, tmpData);
		}
		else if (this.LogNoisiness > 0)
		{
			this.log.trace(`PICT TemplateFromMap [fTemplateFromMapSetRender]::[${tmpHash}]`);
		}

		let tmpTemplateFromMapHash = false;
		let tmpAddressOfMap = false;
		let tmpAddressOfKey = false;

		// This is a 3 part hash with the map address and the key address both
		let tmpTemplateHashPart = tmpHash.split(':');

		if (tmpTemplateHashPart.length < 3)
		{
			this.log.trace(`PICT TemplateFromMap [fTemplateFromMapRenderAsync]::[${tmpHash}] failed because there were not three stanzas in the expression [${pHash}]`);
			return '';
		}

		tmpTemplateFromMapHash = tmpTemplateHashPart[0];
		tmpAddressOfMap = tmpTemplateHashPart[1];
		tmpAddressOfKey = tmpTemplateHashPart[2];

		// No TemplateFromMap hash
		if (!tmpTemplateFromMapHash)
		{
			this.log.warn(`Pict: TemplateFromMap Render Async: TemplateFromMapHash not resolved for [${tmpHash}]`);
			return '';
		}

		// Now resolve the data
		let tmpMap = this.resolveStateFromAddress(tmpAddressOfMap, tmpData, pContextArray);
		let tmpKey = this.resolveStateFromAddress(tmpAddressOfKey, tmpData, pContextArray);

		if (!tmpMap)
		{
			this.log.warn(`Pict: TemplateFromMap Render: Map not resolved for [${tmpHash}]`);
			return '';
		}

		tmpData = tmpMap[tmpKey];

		if (!tmpData)
		{
			// No address was provided, just render the TemplateFromMap with what this TemplateFromMap has.
			return this.pict.parseTemplateSetByHash(tmpTemplateFromMapHash, pData, pContextArray);
		}
		else
		{
			return this.pict.parseTemplateSetByHash(tmpTemplateFromMapHash, tmpData, pContextArray);
		}
	}

	renderAsync(pHash, pData, fCallback, pContextArray)
	{
		let tmpHash = pHash.trim();
		let tmpData = (typeof (pData) === 'object') ? pData : {};
		let tmpCallback = (typeof (fCallback) === 'function') ? fCallback : () => { return ''; };

		if (this.LogNoisiness > 4)
		{
			this.log.trace(`PICT TemplateFromMap [fTemplateFromMapSetRenderAsync]::[${tmpHash}] with tmpData:`, tmpData);
		}
		else if (this.LogNoisiness > 0)
		{
			this.log.trace(`PICT TemplateFromMap [fTemplateFromMapSetRenderAsync]::[${tmpHash}]`);
		}

		let tmpTemplateFromMapHash = false;
		let tmpAddressOfMap = false;
		let tmpAddressOfKey = false;

		// This is a 3 part hash with the map address and the key address both
		let tmpTemplateHashPart = tmpHash.split(':');

		if (tmpTemplateHashPart.length < 3)
		{
			this.log.trace(`PICT TemplateFromMap [fTemplateFromMapRenderAsync]::[${tmpHash}] failed because there were not three stanzas in the expression [${pHash}]`);
			return fCallback(null, '');
		}

		tmpTemplateFromMapHash = tmpTemplateHashPart[0];
		tmpAddressOfMap = tmpTemplateHashPart[1];
		tmpAddressOfKey = tmpTemplateHashPart[2];

		// No TemplateFromMap hash
		if (!tmpTemplateFromMapHash)
		{
			this.log.warn(`Pict: TemplateFromMapSet Render Async: TemplateFromMapHash not resolved for [${tmpHash}]`);
			return fCallback(null, '');
		}

		// Now resolve the data
		let tmpMap = this.resolveStateFromAddress(tmpAddressOfMap, tmpData, pContextArray);
		let tmpKey = this.resolveStateFromAddress(tmpAddressOfKey, tmpData, pContextArray);

		if (!tmpMap)
		{
			this.log.warn(`Pict: TemplateFromMapSet Render: Map not resolved for [${tmpHash}]`);
			return fCallback(null, '');
		}

		tmpData = tmpMap[tmpKey];

		if (!tmpData)
		{
			// No address was provided, just render the TemplateFromMap with what this TemplateFromMap has.
			// The async portion of this is a mind bender because of how entry can happen dynamically from TemplateFromMaps
			return this.pict.parseTemplateSetByHash(tmpTemplateFromMapHash, pData,
				(pError, pValue) =>
				{
					if (pError)
					{
						return tmpCallback(pError, '');
					}
					return tmpCallback(null, pValue);
				}, pContextArray);
		}
		else
		{
			return this.pict.parseTemplateSetByHash(tmpTemplateFromMapHash, tmpData,
				(pError, pValue) =>
				{
					if (pError)
					{
						return tmpCallback(pError, '');
					}
					return tmpCallback(null, pValue);
				}, pContextArray);
		}
	}
}

module.exports = PictTemplateProviderTemplateSetFromMap;