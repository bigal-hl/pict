/**
* Unit tests for the Pict Addressed Template expression: {[Address]}
*
* Resolves the address to a string and renders that string as a template
* against the current Record / Context / Scope / State.  When the address
* doesn't resolve to a string, a warning is logged and '' is returned.
*
* @license     MIT
*
* @author      Steven Velozo <steven@velozo.com>
*/

const Chai = require("chai");
const Expect = Chai.expect;

const libPict = require('../source/Pict.js');

const _MockSettings = (
	{
		Product: 'MockPict',
		ProductVersion: '1.0.0'
	});

suite(
		'Pict Addressed Template Expression',
		function ()
		{
			setup(
					function ()
					{
					}
				);

			suite(
					'Basic synchronous behavior',
					function ()
					{
						test(
								'Resolves an AppData address to a template string and renders it.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.AppData.MyTemplate = 'TEMPLATED CONTENT HERE, {~D:AppData.SomeValue~}.';
									testPict.AppData.SomeValue = 'CHOCOLATE';

									let tmpResult = testPict.parseTemplate('{[AppData.MyTemplate]}');
									Expect(tmpResult).to.equal('TEMPLATED CONTENT HERE, CHOCOLATE.');
									return fDone();
								}
							);

						test(
								'Resolved template can reference Record-relative data.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.AppData.GreetingTemplate = 'Hello, {~D:Record.Name~}!';

									let tmpResult = testPict.parseTemplate(
										'>>> {[AppData.GreetingTemplate]} <<<',
										{ Name: 'Frankenberry' });

									Expect(tmpResult).to.equal('>>> Hello, Frankenberry! <<<');
									return fDone();
								}
							);

						test(
								'Resolved template body containing HTML and stray `>` chars survives.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.AppData.ListTemplate =
										'<ul>{~TS:Cereal-Row:AppData.Cereals~}</ul>';
									testPict.TemplateProvider.addTemplate('Cereal-Row',
										'<li>{~D:Record.Name~}</li>');
									testPict.AppData.Cereals =
									[
										{ Name: 'Count Chocula' },
										{ Name: 'Booberry' }
									];

									let tmpResult = testPict.parseTemplate('{[AppData.ListTemplate]}');
									Expect(tmpResult).to.equal(
										'<ul><li>Count Chocula</li><li>Booberry</li></ul>');
									return fDone();
								}
							);

						test(
								'Multiple addressed templates in one parse work side by side.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.AppData.Greeting = 'Hi, {~D:AppData.UserName~}';
									testPict.AppData.Farewell = 'Bye, {~D:AppData.UserName~}';
									testPict.AppData.UserName = 'Boo';

									let tmpResult = testPict.parseTemplate(
										'[{[AppData.Greeting]}] / [{[AppData.Farewell]}]');

									Expect(tmpResult).to.equal('[Hi, Boo] / [Bye, Boo]');
									return fDone();
								}
							);

						test(
								'Resolved template can pull from Bundle and Context scopes.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.Bundle.Greeting = 'Welcome, {~D:Context[0].UserName~}.';

									let tmpResult = testPict.parseTemplate(
										'{[Bundle.Greeting]}',
										{ },
										null,
										[ { UserName: 'Yummy Mummy' } ]);

									Expect(tmpResult).to.equal('Welcome, Yummy Mummy.');
									return fDone();
								}
							);

						test(
								'Address with bracket indexing resolves correctly.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.AppData.Templates =
									[
										'tpl-zero: {~D:AppData.Token~}',
										'tpl-one: {~D:AppData.Token~}'
									];
									testPict.AppData.Token = 'pumpkin';

									let tmpResult = testPict.parseTemplate('{[AppData.Templates[1]]}');
									Expect(tmpResult).to.equal('tpl-one: pumpkin');
									return fDone();
								}
							);
					}
				);

			suite(
					'Missing or invalid addresses',
					function ()
					{
						test(
								'Address that does not resolve logs a warning and renders empty.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									let tmpWarnings = [];
									testPict.log.warn = (pMessage) => tmpWarnings.push(pMessage);

									let tmpResult = testPict.parseTemplate(
										'before-{[AppData.Missing.Path]}-after');

									Expect(tmpResult).to.equal('before--after');
									Expect(tmpWarnings).to.have.length(1);
									Expect(tmpWarnings[0]).to.contain('Address [AppData.Missing.Path]');
									Expect(tmpWarnings[0]).to.contain('did not resolve');
									Expect(tmpWarnings[0]).to.contain('{[AppData.Missing.Path]}');
									return fDone();
								}
							);

						test(
								'Empty address logs a warning and renders empty.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									let tmpWarnings = [];
									testPict.log.warn = (pMessage) => tmpWarnings.push(pMessage);

									let tmpResult = testPict.parseTemplate('[{[]}]');

									Expect(tmpResult).to.equal('[]');
									Expect(tmpWarnings).to.have.length(1);
									Expect(tmpWarnings[0]).to.contain('No address provided');
									return fDone();
								}
							);

						test(
								'Address that resolves to a non-string logs a warning and renders empty.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.AppData.NotAString = { Name: 'Frankenberry', Age: 51 };
									let tmpWarnings = [];
									testPict.log.warn = (pMessage) => tmpWarnings.push(pMessage);

									let tmpResult = testPict.parseTemplate('[{[AppData.NotAString]}]');

									Expect(tmpResult).to.equal('[]');
									Expect(tmpWarnings).to.have.length(1);
									Expect(tmpWarnings[0]).to.contain('non-string');
									Expect(tmpWarnings[0]).to.contain('AppData.NotAString');
									return fDone();
								}
							);

						test(
								'Address that resolves to an empty string renders empty (no warning).',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.AppData.EmptyTemplate = '';
									let tmpWarnings = [];
									testPict.log.warn = (pMessage) => tmpWarnings.push(pMessage);

									let tmpResult = testPict.parseTemplate('[{[AppData.EmptyTemplate]}]');

									Expect(tmpResult).to.equal('[]');
									Expect(tmpWarnings).to.have.length(0);
									return fDone();
								}
							);
					}
				);

			suite(
					'Asynchronous behavior',
					function ()
					{
						test(
								'Addressed template renders via callback.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.AppData.MyTemplate = 'async: {~D:AppData.Token~}';
									testPict.AppData.Token = 'OK';

									testPict.parseTemplate('{[AppData.MyTemplate]}', {},
										(pError, pValue) =>
										{
											Expect(pError).to.not.be.an('error');
											Expect(pValue).to.equal('async: OK');
											return fDone();
										});
								}
							);

						test(
								'Async path on missing address logs a warning and yields empty.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									let tmpWarnings = [];
									testPict.log.warn = (pMessage) => tmpWarnings.push(pMessage);

									testPict.parseTemplate(
										'[{[AppData.Nope.Nope]}]', {},
										(pError, pValue) =>
										{
											Expect(pError).to.not.be.an('error');
											Expect(pValue).to.equal('[]');
											Expect(tmpWarnings).to.have.length(1);
											Expect(tmpWarnings[0]).to.contain('did not resolve');
											return fDone();
										});
								}
							);

						test(
								'Async path resolves nested async expressions inside the addressed template.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.TemplateProvider.addTemplate('Row',
										'<li>{~D:Record.Name~}</li>');
									testPict.AppData.ListTemplate =
										'<ul>{~TS:Row:AppData.Cereals~}</ul>';
									testPict.AppData.Cereals =
									[
										{ Name: 'Count Chocula' },
										{ Name: 'Frankenberry' }
									];

									testPict.parseTemplate('{[AppData.ListTemplate]}', {},
										(pError, pValue) =>
										{
											Expect(pError).to.not.be.an('error');
											Expect(pValue).to.equal(
												'<ul><li>Count Chocula</li><li>Frankenberry</li></ul>');
											return fDone();
										});
								}
							);
					}
				);

			suite(
					'Composition with other expressions',
					function ()
					{
						test(
								'Addressed template inside a {~TS:~} row receives the per-row Record.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.AppData.RowTemplate = '<li>{~D:Record.Name~} #{~D:Record.Year~}</li>';
									testPict.TemplateProvider.addTemplate('Row', '{[AppData.RowTemplate]}');

									testPict.AppData.Cereals =
									[
										{ Name: 'Count Chocula', Year: 1971 },
										{ Name: 'Booberry',      Year: 1973 }
									];

									let tmpResult = testPict.parseTemplate(
										'<ul>{~TS:Row:AppData.Cereals~}</ul>');

									Expect(tmpResult).to.equal(
										'<ul>'
										+ '<li>Count Chocula #1971</li>'
										+ '<li>Booberry #1973</li>'
										+ '</ul>');
									return fDone();
								}
							);

						test(
								'Addressed template composes inside an inline template.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.AppData.InnerTemplate = '{~D:AppData.User.Name~}';
									testPict.AppData.User = { Name: 'Frute Brute' };

									let tmpResult = testPict.parseTemplate(
										'{<Greeting: {[AppData.InnerTemplate]} (end).>}');

									Expect(tmpResult).to.equal('Greeting: Frute Brute (end).');
									return fDone();
								}
							);

						test(
								'Addressed template can resolve another addressed template (chained).',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.AppData.Outer = '<outer>{[AppData.Inner]}</outer>';
									testPict.AppData.Inner = 'value={~D:AppData.X~}';
									testPict.AppData.X = '42';

									let tmpResult = testPict.parseTemplate('{[AppData.Outer]}');
									Expect(tmpResult).to.equal('<outer>value=42</outer>');
									return fDone();
								}
							);
					}
				);
		}
	);
