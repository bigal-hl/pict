/**
* @author <steven@velozo.com>
*/
const libFable = require('fable');

class Pict extends libFable
{
	constructor(pSettings)
	{
		super(pSettings);

		this.isBrowser = new Function("try {return (this===window);} catch(pError) {return false;}");

		// The templateProvider provides a basic key->template mapping with default fallback capabilities
		this.addAndInstantiateServiceType('TemplateProvider', require('./Pict-Template-Provider.js'));
		this.addAndInstantiateServiceType('EntityProvider',  require('./Pict-Meadow-EntityProvider.js'));
		this.addAndInstantiateServiceType('DataProvider',  require('./Pict-DataProvider.js'));
		this.addAndInstantiateServiceType('ContentAssignment',  require('./Pict-Content-Assignment.js'));
		this.addAndInstantiateServiceType('CSSMap', require('./Pict-CSS.js'));

		this.instantiateServiceProvider('MetaTemplate');
		this.instantiateServiceProvider('DataGeneration');

		this.manifest = this.instantiateServiceProvider('Manifest');

		this.AppData = {};
		this.Bundle = {};

		// Log noisness goes from 0 - 5, where 5 is show me everything.
		this.LogNoisiness = 0;

		// Load manifest sets
		if (this.settings.Manifests)
		{
			this.loadManifestSet(this.settings.Manifests);
		}

		this._DefaultPictTemplatesInitialized = false;
		this.initializePictTemplateEngine();

		this.addServiceType('PictView',  require('pict-view'));
		this.addServiceType('PictApplication',  require('pict-application'));

		// Expose the named views directly, through a convenience accessor
		this.views = this.servicesMap.PictView;
	}

	// Load manifests in as Hashed services
	loadManifestSet (pManifestSet)
	{
		if (typeof(pManifestSet) != 'object')
		{
			this.log.warn(`PICT [${this.UUID}] could not load Manifest Set; pManifestSet was not an object.`);
			return false;
		}
		let tmpManifestKeys = Object.keys(pManifestSet);
		if (tmpManifestKeys.length > 0)
		{
			for (let i = 0; i < tmpManifestKeys.length; i++ )
			{
				// Load each manifest
				let tmpManifestKey = tmpManifestKeys[i];
				this.instantiateServiceProvider('Manifest', pManifestSet[tmpManifestKey], tmpManifestKey);
			}
		}
	}

	// Just passing an options will construct one for us.
	// Passing a hash will set the hash.
	// Passing a prototype will use that!
	addView(pViewHash, pOptions, pViewPrototype)
	{
		let tmpOptions = (typeof(pOptions) == 'object') ? pOptions : {};
		let tmpViewHash = (typeof(pViewHash) == 'string') ? pViewHash : this.fable.getUUID();

		if (typeof(pViewPrototype) != 'undefined')
		{
			// If the prototype has a default_configuration, it will be merged with options.
			if (pViewPrototype.hasOwnProperty('default_configuration'))
			{
				tmpOptions = this.fable.Utility.extend({}, pViewPrototype.default_configuration, tmpOptions);
			}
			return this.instantiateServiceProviderFromPrototype('PictView', tmpOptions, tmpViewHash, pViewPrototype);
		}
		else
		{
			return this.instantiateServiceProvider('PictView', tmpOptions, tmpViewHash);
		}
	}

	// Just passing an options will construct one for us.
	// Passing a hash will set the hash.
	// Passing a prototype will use that!
	addApplication(pApplicationHash, pOptions, pApplicationPrototype)
	{
		let tmpOptions = (typeof(pOptions) == 'object') ? pOptions : {};
		let tmpApplicationHash = (typeof(pApplicationHash) == 'string') ? pApplicationHash : this.fable.getUUID();

		if (typeof(pApplicationPrototype) != 'undefined')
		{
			// If the prototype has a default_configuration, it will be merged with options.
			if (pApplicationPrototype.hasOwnProperty('default_configuration'))
			{
				tmpOptions = this.fable.Utility.extend({}, pApplicationPrototype.default_configuration, tmpOptions);
			}

			return this.instantiateServiceProviderFromPrototype('PictApplication', tmpOptions, tmpApplicationHash, pApplicationPrototype);
		}
		else
		{
			return this.instantiateServiceProvider('PictApplication', tmpOptions, tmpApplicationHash);
		}
	}

	initializePictTemplateEngine()
	{
		/*
		 *
		 * To stave off madness, these are inefficient for now.  The wkhtmltopdf renderer leaves much to be desired
		 * in the way of feedback with regards to javascript compatibility.
		 *
		 */
		if (!this._DefaultPictTemplatesInitialized)
		{
			// Expects one of the following:
			// 		{~E:Book^AppData.Some.Address.IDBook^Render-Book-Template~}
			//          ...meaning GET BOOK with IDBook FROM AppData.Some.Address.IDBook and render it to Render-Book-Template
			let fEntityRender = (pHash, pData, fCallback) =>
				{
					let tmpHash = pHash.trim();
					let tmpData = (typeof(pData) === 'object') ? pData : {};

					if (this.LogNoisiness > 4)
					{
						this.log.trace(`PICT Template [fEntityRender]::[${tmpHash}] with tmpData:`, tmpData);
					}
					else if (this.LogNoisiness > 0)
					{
						this.log.trace(`PICT Template [fEntityRender]::[${tmpHash}]`);
					}

					let tmpEntity = false;
					let tmpEntityID = false;
					let tmpEntityTemplate = false;

					// This expression requires 2 parts -- a third is optional, and, if present, is the template to render to.
					let tmpAddressParts = tmpHash.split('^');

					if (tmpAddressParts.length < 2)
					{
						this.log.warn(`Pict: Entity Render: Entity or entity ID not resolved for [${tmpHash}]`);
						return fCallback(Error(`Pict: Entity Render: Entity or entity ID not resolved for [${tmpHash}]`), '');
					}

					tmpEntity = tmpAddressParts[0].trim();
					tmpEntityID = tmpAddressParts[1].trim();
					tmpEntityTemplate = tmpAddressParts[2].trim();

					if (!isNaN(tmpEntityID))
					{
						tmpEntityID = parseInt(tmpEntityID);
					}
					else
					{
						// This is an address, so we need to get the value at the address
						tmpEntityID = this.manifest.getValueByHash({AppData:this.AppData, Bundle:this.Bundle, Record:tmpData}, tmpEntityID);
					}

					// No Entity or EntityID
					if (!tmpEntity || !tmpEntityID)
					{
						this.log.warn(`Pict: Entity Render: Entity or entity ID not resolved for [${tmpHash}]  Entity: ${tmpEntity} ID: ${tmpEntityID}`);
						return fCallback(Error(`Pict: Entity Render: Entity or entity ID not resolved for [${tmpHash}]  Entity: ${tmpEntity} ID: ${tmpEntityID}`), '');
					}

					// Now try to get the entity
					this.EntityProvider.getEntity(tmpEntity, tmpEntityID,
						(pError, pRecord) =>
						{
							if (pError)
							{
								this.log.error(`Pict: Entity Render: Error getting entity [${tmpEntity}] with ID [${tmpEntityID}] for [${tmpHash}]: ${pError}`, pError);
								return fCallback(pError, '');
							}

							// Now render the template
							if (tmpEntityTemplate)
							{
								return fCallback(null, this.parseTemplateByHash(tmpEntityTemplate, pRecord));
							}
							else
							{
								return fCallback(null, '');
							}
						});
				};
			this.MetaTemplate.addPatternAsync('{~E:', '~}', fEntityRender);
			this.MetaTemplate.addPatternAsync('{~Entity:', '~}', fEntityRender);

			// {NE~Some.Address|If the left value is truthy, render this value.~}
			let fNotEmptyRender = (pHash, pData)=>
				{
					let tmpHash = pHash.trim();
					let tmpData = (typeof(pData) === 'object') ? pData : {};

					if (this.LogNoisiness > 4)
					{
						this.log.trace(`PICT Template [fNotEmptyRender]::[${tmpHash}] with tmpData:`, tmpData);
					}
					else if (this.LogNoisiness > 2)
					{
						this.log.trace(`PICT Template [fNotEmptyRender]::[${tmpHash}]`);
					}

					// Should switch this to indexOf so pipes can be in the content.
					let tmpHashParts = tmpHash.split('|');

					// For now just check truthiness
					if (this.manifest.getValueByHash({AppData:this.AppData, Bundle:this.Bundle, Record:tmpData}, tmpHashParts[0]))
					{
						return tmpHashParts[1];
					}
					else
					{
						return '';
					}
				};
			this.MetaTemplate.addPattern('{~NotEmpty:', '~}', fNotEmptyRender);
			this.MetaTemplate.addPattern('{~NE:', '~}', fNotEmptyRender);

			// {~T:Template:AddressOfData~}
			let fTemplateRender = (pHash, pData)=>
				{
					let tmpHash = pHash.trim();
					let tmpData = (typeof(pData) === 'object') ? pData : {};

					if (this.LogNoisiness > 4)
					{
						this.log.trace(`PICT Template [fTemplateRender]::[${tmpHash}] with tmpData:`, tmpData);
					}
					else if (this.LogNoisiness > 0)
					{
						this.log.trace(`PICT Template [fTemplateRender]::[${tmpHash}]`);
					}

					let tmpTemplateHash = false;
					let tmpAddressOfData = false;

					// This is just a simple 2 part hash (the entity and the ID)
					let tmpHashTemplateSeparator = tmpHash.indexOf(':');
					tmpTemplateHash = tmpHash.substring(0, tmpHashTemplateSeparator);
					if (tmpHashTemplateSeparator > -1)
					{
						tmpAddressOfData = tmpHash.substring(tmpHashTemplateSeparator + 1);
					}
					else
					{
						tmpTemplateHash = tmpHash;
					}

					// No template hash
					if (!tmpTemplateHash)
					{
						this.log.warn(`Pict: Template Render: TemplateHash not resolved for [${tmpHash}]`);
						return `Pict: Template Render: TemplateHash not resolved for [${tmpHash}]`;
					}

					if (!tmpAddressOfData)
					{
						// No address was provided, just render the template with what this template has.
						return this.parseTemplateByHash(tmpTemplateHash, pData);
					}
					else
					{
						return this.parseTemplateByHash(tmpTemplateHash, this.manifest.getValueByHash({AppData:this.AppData, Bundle:this.Bundle, Record:tmpData}, tmpAddressOfData));
					}
				};
			this.MetaTemplate.addPattern('{~T:', '~}', fTemplateRender);
			this.MetaTemplate.addPattern('{~Template:', '~}', fTemplateRender);

			// {~TS:Template:AddressOfDataSet~}
			let fTemplateSetRender = (pHash, pData)=>
				{
					let tmpHash = pHash.trim();
					let tmpData = (typeof(pData) === 'object') ? pData : {};

					if (this.LogNoisiness > 4)
					{
						this.log.trace(`PICT Template [fTemplateSetRender]::[${tmpHash}] with tmpData:`, tmpData);
					}
					else if (this.LogNoisiness > 0)
					{
						this.log.trace(`PICT Template [fTemplateSetRender]::[${tmpHash}]`);
					}

					let tmpTemplateHash = false;
					let tmpAddressOfData = false;

					// This is just a simple 2 part hash (the entity and the ID)
					let tmpHashTemplateSeparator = tmpHash.indexOf(':');
					tmpTemplateHash = tmpHash.substring(0, tmpHashTemplateSeparator);
					if (tmpHashTemplateSeparator > -1)
					{
						tmpAddressOfData = tmpHash.substring(tmpHashTemplateSeparator + 1);
					}
					else
					{
						tmpTemplateHash = tmpHash;
					}

					// No template hash
					if (!tmpTemplateHash)
					{
						this.log.warn(`Pict: Template Render: TemplateHash not resolved for [${tmpHash}]`);
						return `Pict: Template Render: TemplateHash not resolved for [${tmpHash}]`;
					}

					if (!tmpAddressOfData)
					{
						// No address was provided, just render the template with what this template has.
						return this.parseTemplateSetByHash(tmpTemplateHash, pData);
					}
					else
					{
						return this.parseTemplateSetByHash(tmpTemplateHash, this.manifest.getValueByHash({AppData:this.AppData, Bundle:this.Bundle, Record:tmpData}, tmpAddressOfData));
					}
				};
			this.MetaTemplate.addPattern('{~TS:', '~}', fTemplateSetRender);
			this.MetaTemplate.addPattern('{~TemplateSet:', '~}', fTemplateSetRender);

			//{~Data:AppData.Some.Value.to.Render~}
			let fDataRender = (pHash, pData)=>
				{
					let tmpHash = pHash.trim();
					let tmpData = (typeof(pData) === 'object') ? pData : {};

					if (this.LogNoisiness > 4)
					{
						this.log.trace(`PICT Template [fDataRender]::[${tmpHash}] with tmpData:`, tmpData);
					}
					else if (this.LogNoisiness > 3)
					{
						this.log.trace(`PICT Template [fDataRender]::[${tmpHash}]`);
					}

					let tmpValue = this.manifest.getValueByHash({AppData:this.AppData, Bundle:this.Bundle, Record:tmpData}, tmpHash);
					if ((tmpValue == null) || (tmpValue == 'undefined') || (typeof(tmpValue) == 'undefined'))
					{
						return '';
					}
					return tmpValue;
				};
			this.MetaTemplate.addPattern('{~D:', '~}', fDataRender);
			this.MetaTemplate.addPattern('{~Data:', '~}', fDataRender);

			this.MetaTemplate.addPattern('{~Dollars:', '~}',
				(pHash, pData)=>
				{
					let tmpHash = pHash.trim();
					let tmpData = (typeof(pData) === 'object') ? pData : {};

					if (this.LogNoisiness > 4)
					{
						this.log.trace(`PICT Template [fDollars]::[${tmpHash}] with tmpData:`, tmpData);
					}
					else if (this.LogNoisiness > 3)
					{
						this.log.trace(`PICT Template [fDollars]::[${tmpHash}]`);
					}

					let tmpColumnData = this.manifest.getValueByHash({AppData:this.AppData, Bundle:this.Bundle, Record:tmpData}, tmpHash);
					return this.DataFormat.formatterDollars(tmpColumnData);
				});
			this.MetaTemplate.addPattern('{~Digits:', '~}',
				(pHash, pData)=>
				{
					let tmpHash = pHash.trim();
					let tmpData = (typeof(pData) === 'object') ? pData : {};

					if (this.LogNoisiness > 4)
					{
						this.log.trace(`PICT Template [fDigits]::[${tmpHash}] with tmpData:`, tmpData);
					}
					else if (this.LogNoisiness > 3)
					{
						this.log.trace(`PICT Template [fDigits]::[${tmpHash}]`);
					}

					let tmpColumnData = this.manifest.getValueByHash({AppData:this.AppData, Bundle:this.Bundle, Record:tmpData}, tmpHash);
					return this.DataFormat.formatterAddCommasToNumber(this.DataFormat.formatterRoundNumber(tmpColumnData, 2));
				});

			let fRandomNumberString = (pHash, pData)=>
				{
					let tmpHash = pHash.trim();

					if (this.LogNoisiness > 3)
					{
						this.log.trace(`PICT Template [fRandomNumberString]::[${tmpHash}]`);
					}

					let tmpStringLength = 4;
					let tmpMaxNumber = 9999;

					if (tmpHash.length > 0)
					{
						let tmpHashParts = tmpHash.split(',');
						if (tmpHashParts.length > 0)
						{
							tmpStringLength = parseInt(tmpHashParts[0]);
						}
						if (tmpHashParts.length > 1)
						{
							tmpMaxNumber = parseInt(tmpHashParts[1]);
						}
					}

					return this.DataGeneration.randomNumericString(tmpStringLength, tmpMaxNumber);
				};
			this.MetaTemplate.addPattern('{~RandomNumberString:', '~}',fRandomNumberString);
			this.MetaTemplate.addPattern('{~RNS:', '~}',fRandomNumberString);

			let fRandomNumber = (pHash, pData)=>
				{
					let tmpHash = pHash.trim();

					if (this.LogNoisiness > 3)
					{
						this.log.trace(`PICT Template [fRandomNumber]::[${tmpHash}]`);
					}

					let tmpMinimumNumber = 0;
					let tmpMaxNumber = 9999999;

					if (tmpHash.length > 0)
					{
						let tmpHashParts = tmpHash.split(',');
						if (tmpHashParts.length > 0)
						{
							tmpMinimumNumber = parseInt(tmpHashParts[0]);
						}
						if (tmpHashParts.length > 1)
						{
							tmpMaxNumber = parseInt(tmpHashParts[1]);
						}
					}

					return this.DataGeneration.randomIntegerBetween(tmpMinimumNumber, tmpMaxNumber);
				};
			this.MetaTemplate.addPattern('{~RandomNumber:', '~}',fRandomNumber);
			this.MetaTemplate.addPattern('{~RN:', '~}',fRandomNumber);

			let fPascalCaseIdentifier = (pHash, pData)=>
				{
					let tmpHash = pHash.trim();
					let tmpData = (typeof(pData) === 'object') ? pData : {};

					if (this.LogNoisiness > 4)
					{
						this.log.trace(`PICT Template [fPascalCaseIdentifier]::[${tmpHash}] with tmpData:`, tmpData);
					}
					else if (this.LogNoisiness > 3)
					{
						this.log.trace(`PICT Template [fPascalCaseIdentifier]::[${tmpHash}]`);
					}

					let tmpValue = this.manifest.getValueByHash({AppData:this.AppData, Bundle:this.Bundle, Record:tmpData}, tmpHash);
					if ((tmpValue == null) || (tmpValue == 'undefined') || (typeof(tmpValue) == 'undefined'))
					{
						return '';
					}
					return this.DataFormat.cleanNonAlphaCharacters(this.DataFormat.capitalizeEachWord(tmpValue));
				};
			this.MetaTemplate.addPattern('{~PascalCaseIdentifier:', '~}',fPascalCaseIdentifier);

			let fLogValue = (pHash, pData)=>
				{
					let tmpHash = pHash.trim();
					let tmpData = (typeof(pData) === 'object') ? pData : {};

					let tmpValue = this.manifest.getValueByHash({AppData:this.AppData, Bundle:this.Bundle, Record:tmpData}, tmpHash);
					let tmpValueType = typeof(tmpValue);
					if ((tmpValue == null) || (tmpValueType == 'undefined'))
					{
						this.log.trace(`PICT Template Log Value: [${tmpHash}] is ${tmpValueType}.`);
					}
					else if (tmpValueType == 'object')
					{
						this.log.trace(`PICT Template Log Value: [${tmpHash}] is an obect.`, tmpValue);
					}
					else
					{
						this.log.trace(`PICT Template Log Value: [${tmpHash}] if a ${tmpValueType} = [${tmpValue}]`);
					}
					return '';
				};
			this.MetaTemplate.addPattern('{~LogValue:', '~}',fLogValue);
			this.MetaTemplate.addPattern('{~LV:', '~}',fLogValue);


			let fLogStatement = (pHash, pData)=>
				{
					let tmpHash = pHash.trim();
					this.log.trace(`PICT Template Log Message: ${tmpHash}`);
					return '';
				};
			this.MetaTemplate.addPattern('{~LogStatement:', '~}',fLogStatement);
			this.MetaTemplate.addPattern('{~LS:', '~}',fLogStatement);

			let fBreakpoint = (pHash, pData)=>
				{
					let tmpHash = pHash.trim();
					let tmpError = new Error(`PICT Template Breakpoint: ${tmpHash}`);
					this.log.trace(`PICT Template Breakpoint: ${tmpHash}`, tmpError.stack);
					debugger;
					return '';
				};
			this.MetaTemplate.addPattern('{~Breakpoint', '~}',fBreakpoint);

			this._DefaultPictTemplatesInitialized = true;
		}
	}

	parseTemplate (pTemplateString, pData, fCallback)
	{
		let tmpData = (typeof(pData) === 'object') ? pData : {};
		return this.MetaTemplate.parseString(pTemplateString, tmpData, fCallback);
	}

	parseTemplateByHash (pTemplateHash, pData, fCallback)
	{
		let tmpTemplateString = this.TemplateProvider.getTemplate(pTemplateHash);

		// TODO: Unsure if returning empty is always the right behavior -- if it isn't we will use config to set the behavior
		if (!tmpTemplateString)
		{
			return '';
		}
		return this.parseTemplate(tmpTemplateString, pData, fCallback);
	}

	parseTemplateSet (pTemplateString, pDataSet, fCallback)
	{
		// TODO: This will need streaming -- for now janky old string append does the trick
		let tmpValue = '';
		if (typeof(fCallback) == 'function')
		{
			if (Array.isArray(pDataSet) || typeof(pDataSet) == 'object')
			{
				this.Utility.eachLimit(pDataSet, 1,
					(pRecord, fRecordTemplateCallback)=>
					{
						return this.parseTemplate(pTemplateString, pRecord,
							(pError, pTemplateResult)=>
							{
								tmpValue += pTemplateResult;
								return fRecordTemplateCallback();
							});
					},
					(pError)=>
					{
						return fCallback(pError, tmpValue);
					});
			}
			else
			{
				return fCallback(Error('Pict: Template Set: pDataSet is not an array or object.'), '');
			}
		}
		else
		{
			if (Array.isArray(pDataSet) || typeof(pDataSet) == 'object')
			{
				if (Array.isArray(pDataSet))
				{
					for (let i = 0; i < pDataSet.length; i++)
					{
						tmpValue += this.parseTemplate(pTemplateString, pDataSet[i]);
					}
				}
				else
				{
					let tmpKeys = Object.keys(pDataSet);
					for (let i = 0; i < tmpKeys.length; i++)
					{
						tmpValue += this.parseTemplate(pTemplateString, pDataSet[tmpKeys[i]]);
					}
				}

				return tmpValue;
			}
			else
			{
				return '';
			}			
		}
	}

	parseTemplateSetByHash (pTemplateHash, pDataSet, fCallback)
	{
		let tmpTemplateString = this.TemplateProvider.getTemplate(pTemplateHash);

		// TODO: Unsure if returning empty is always the right behavior -- if it isn't we will use config to set the behavior
		if (!tmpTemplateString)
		{
			return '';
		}
		return this.parseTemplateSet(tmpTemplateString, pDataSet, fCallback);
	}
};

module.exports = Pict;

module.exports.PictApplicationClass = require('pict-application');
module.exports.PictViewClass = require('pict-view');

module.exports.EnvironmentLog = require('./environments/Pict-Environment-Log.js');
module.exports.EnvironmentObject = require('./environments/Pict-Environment-Object.js');

// This is to help understand the type of enivironement we're executing in
module.exports.isBrowser = new Function("try {return (this===window);} catch(pError) {return false;}");