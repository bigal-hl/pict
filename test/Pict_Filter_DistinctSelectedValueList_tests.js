/*
	Unit tests for the DistinctSelectedValueList filter clause type.

	These run the FilterMeadowStanzaTokenGenerator pipeline directly
	(generate → link → normalize → compile) and assert on the compiled
	BundleConfig — no live API server required.
*/

const Chai = require('chai');
const Expect = Chai.expect;

const libPict = require('../source/Pict.js');
const libFilter = require('../source/filters/Filter.js');

suite
(
	'Pict Filter DistinctSelectedValueList Tests',
	() =>
	{
		/** @type {libPict} */
		let _Pict;

		setup(() =>
		{
			_Pict = new libPict({ Product: 'PictFilterDistinctTest' });
		});

		/**
		 * Run the full stanza pipeline for a filter configuration and return
		 * the core load step (the last BundleConfig entry).
		 *
		 * @param {Array<Record<string, any>>} pFilterConfiguration
		 * @return {Record<string, any>}
		 */
		const compileToCoreLoadStep = (pFilterConfiguration) =>
		{
			const tmpState =
			{
				Entity: 'C182_Moisture_Day',
				Filter: 'C182_Moisture_Day-Test',
				ResultDestinationAddress: 'AppData.Test',
				Mode: 'Records',
				FilterConfiguration: pFilterConfiguration,
			};
			const tmpFilter = new libFilter(_Pict);
			tmpFilter.generateMeadowFilterStanzas(tmpState);
			tmpFilter.linkPreparedFilters(tmpState);
			tmpFilter.normalizeMeadowFilterStanzas(tmpState);
			tmpFilter.compileMeadowFilterStanzas(tmpState);
			return tmpState.BundleConfig[tmpState.BundleConfig.length - 1];
		};

		test
		(
			'Two string values with special characters compile to one EQ or-chain paren group',
			function()
			{
				const tmpCoreLoadStep = compileToCoreLoadStep(
				[
					{
						Type: 'DistinctSelectedValueList',
						FilterByColumn: 'Product',
						Values: [ '1/4" Chip', `MFG'D Sand` ],
					}
				]);
				Expect(tmpCoreLoadStep.Entity).to.equal('C182_Moisture_Day');
				Expect(tmpCoreLoadStep.Filter).to.equal(`FOP~0~(~0~FBVOR~Product~EQ~1%2F4%22%20Chip~FBVOR~Product~EQ~MFG'D%20Sand~FCP~0~)~0`);
			}
		);

		test
		(
			'A single value compiles to one EQ stanza inside one paren group',
			function()
			{
				const tmpCoreLoadStep = compileToCoreLoadStep(
				[
					{
						Type: 'DistinctSelectedValueList',
						FilterByColumn: 'Material',
						Values: [ 'Natural Sand' ],
					}
				]);
				Expect(tmpCoreLoadStep.Filter).to.equal('FOP~0~(~0~FBVOR~Material~EQ~Natural%20Sand~FCP~0~)~0');
			}
		);

		test
		(
			'Numeric values compile unquoted (entity-ID columns work too)',
			function()
			{
				const tmpCoreLoadStep = compileToCoreLoadStep(
				[
					{
						Type: 'DistinctSelectedValueList',
						FilterByColumn: 'IDProject',
						Values: [ 30677, 32266 ],
					}
				]);
				Expect(tmpCoreLoadStep.Filter).to.equal('FOP~0~(~0~FBVOR~IDProject~EQ~30677~FBVOR~IDProject~EQ~32266~FCP~0~)~0');
			}
		);

		test
		(
			'Empty values produce an empty filter (clause is a no-op)',
			function()
			{
				const tmpCoreLoadStep = compileToCoreLoadStep(
				[
					{
						Type: 'DistinctSelectedValueList',
						FilterByColumn: 'Product',
						Values: [],
					}
				]);
				Expect(tmpCoreLoadStep.Filter).to.equal('');
			}
		);

		test
		(
			'Values containing a tilde are skipped (unrepresentable in the meadow filter syntax); nulls are skipped',
			function()
			{
				const tmpCoreLoadStep = compileToCoreLoadStep(
				[
					{
						Type: 'DistinctSelectedValueList',
						FilterByColumn: 'Product',
						Values: [ 'Good Value', 'Bad~Value', null ],
					}
				]);
				Expect(tmpCoreLoadStep.Filter).to.equal('FOP~0~(~0~FBVOR~Product~EQ~Good%20Value~FCP~0~)~0');
			}
		);

		test
		(
			'A disabled clause emits nothing',
			function()
			{
				const tmpCoreLoadStep = compileToCoreLoadStep(
				[
					{
						Type: 'DistinctSelectedValueList',
						FilterByColumn: 'Product',
						Values: [ 'Anything' ],
						Enabled: false,
					}
				]);
				Expect(tmpCoreLoadStep.Filter).to.equal('');
			}
		);

		test
		(
			'Combined with a DateRange clause: two flat paren groups, no double-wrap',
			function()
			{
				const tmpCoreLoadStep = compileToCoreLoadStep(
				[
					{
						Type: 'DistinctSelectedValueList',
						FilterByColumn: 'Product',
						Values: [ '5/8" Chip' ],
					},
					{
						Type: 'DateRange',
						FilterByColumn: 'BucketDate',
						Values:
						{
							Start: '2026-02-01',
							End: '2026-02-28',
						},
					}
				]);
				Expect(tmpCoreLoadStep.Filter).to.equal('FOP~0~(~0~FBVOR~Product~EQ~5%2F8%22%20Chip~FCP~0~)~0~FOP~0~(~0~FBV~BucketDate~GE~2026-02-01~FBV~BucketDate~LE~2026-02-28~FCP~0~)~0');
				// The single-wrap invariant: exactly one FOP per logical group.
				Expect((tmpCoreLoadStep.Filter.match(/FOP/g) || []).length).to.equal(2);
			}
		);
	}
);
