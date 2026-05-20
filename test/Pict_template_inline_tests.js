/**
* Unit tests for the Pict Inline Template expression: {<...>}
*
* The inline template expression captures the raw content between its
* `{<` and `>}` delimiters and re-parses it as a template at runtime,
* with the surrounding Record / Context / Scope / State intact.  The body
* can contain stray `>` or `}` characters in any order -- the meta-template
* parser rolls back partial end-pattern matches so only a literal `>}`
* closes the block.
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
		'Pict Inline Template Expression',
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
								'Inline template with no nested tags returns its literal contents.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									let tmpTemplateOutput = testPict.parseTemplate('{<hello world>}');
									Expect(tmpTemplateOutput).to.equal('hello world');
									return fDone();
								}
							);

						test(
								'Empty inline template renders as an empty string.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									let tmpTemplateOutput = testPict.parseTemplate('a{<>}b');
									Expect(tmpTemplateOutput).to.equal('ab');
									return fDone();
								}
							);

						test(
								'Inline template resolves AppData addresses inside its body.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.AppData.User = { Name: 'Frankenberry', Age: 51 };

									let tmpTemplateOutput = testPict.parseTemplate(
										'{<Hello, {~D:AppData.User.Name~}.  You are {~D:AppData.User.Age~} years old.>}');

									Expect(tmpTemplateOutput).to.equal('Hello, Frankenberry.  You are 51 years old.');
									return fDone();
								}
							);

						test(
								'Inline template resolves Record-relative addresses.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									let tmpTemplateOutput = testPict.parseTemplate(
										'<p>{<Name: {~D:Record.Name~}>}</p>',
										{ Name: 'Count Chocula' });

									Expect(tmpTemplateOutput).to.equal('<p>Name: Count Chocula</p>');
									return fDone();
								}
							);

						test(
								'Inline template mixes literal text and several nested tags.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.AppData.Product = { Name: 'Booberry', Price: 4 };

									let tmpTemplateOutput = testPict.parseTemplate(
										'{<[{~D:AppData.Product.Name~}] costs ${~D:AppData.Product.Price~}.>}');

									Expect(tmpTemplateOutput).to.equal('[Booberry] costs $4.');
									return fDone();
								}
							);

						test(
								'Multiple inline templates may appear side by side.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.AppData.User = { First: 'Yummy', Last: 'Mummy' };

									let tmpTemplateOutput = testPict.parseTemplate(
										'{<{~D:AppData.User.First~}>}-{<{~D:AppData.User.Last~}>}');

									Expect(tmpTemplateOutput).to.equal('Yummy-Mummy');
									return fDone();
								}
							);

						test(
								'Inline template invokes a registered child template via {~T:~}.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.TemplateProvider.addTemplate('GreetingChild',
										'Welcome, {~D:Record.Name~}!');
									testPict.AppData.Guest = { Name: 'Frute Brute' };

									let tmpTemplateOutput = testPict.parseTemplate(
										'{<>>> {~T:GreetingChild:AppData.Guest~} <<<>}');

									Expect(tmpTemplateOutput).to.equal('>>> Welcome, Frute Brute! <<<');
									return fDone();
								}
							);

						test(
								'Inline template iterates a list via {~TS:~} with HTML tags in the body.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.TemplateProvider.addTemplate('Cereal-Row',
										'<li>{~D:Record.Name~}</li>');
									testPict.AppData.Cereals =
									[
										{ Name: 'Count Chocula' },
										{ Name: 'Frankenberry' },
										{ Name: 'Booberry' }
									];

									let tmpTemplateOutput = testPict.parseTemplate(
										'{<<ul>{~TS:Cereal-Row:AppData.Cereals~}</ul>>}');

									Expect(tmpTemplateOutput).to.equal(
										'<ul><li>Count Chocula</li><li>Frankenberry</li><li>Booberry</li></ul>');
									return fDone();
								}
							);

						test(
								'Inline template body containing stray `>` chars survives correctly.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.AppData.Arrow = '=>';

									// Multiple > and } characters in the body that don't form `>}`.
									let tmpTemplateOutput = testPict.parseTemplate(
										'{<a > b > c -- {~D:AppData.Arrow~} -- } } }>}');

									Expect(tmpTemplateOutput).to.equal('a > b > c -- => -- } } }');
									return fDone();
								}
							);

						test(
								'Inline template re-evaluates its body, so missing addresses render as empty.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									// Empty record -- the inner {~D:~} resolves to undefined and emits ''.
									let tmpTemplateOutput = testPict.parseTemplate(
										'before-{<x={~D:Record.Missing~}.>}-after');

									Expect(tmpTemplateOutput).to.equal('before-x=.-after');
									return fDone();
								}
							);

						test(
								'Inline template renders nothing when the body is omitted.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									let tmpTemplateOutput = testPict.parseTemplate('a{<>}{<>}{<>}b');
									Expect(tmpTemplateOutput).to.equal('ab');
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
								'Inline template renders via callback (async path).',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.AppData.User = { Name: 'Frankenberry' };

									testPict.parseTemplate(
										'{<Hi, {~D:AppData.User.Name~}!>}', {},
										(pError, pValue) =>
										{
											Expect(pError).to.not.be.an('error');
											Expect(pValue).to.equal('Hi, Frankenberry!');
											return fDone();
										});
								}
							);

						test(
								'Empty inline template renders empty via callback.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.parseTemplate('a{<>}b', {},
										(pError, pValue) =>
										{
											Expect(pError).to.not.be.an('error');
											Expect(pValue).to.equal('ab');
											return fDone();
										});
								}
							);

						test(
								'Inline template with nested expressions resolves under async callback.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.TemplateProvider.addTemplate('Row',
										'<li>{~D:Record.Name~}</li>');
									testPict.AppData.Cereals =
									[
										{ Name: 'Count Chocula' },
										{ Name: 'Frankenberry' }
									];

									testPict.parseTemplate(
										'{<<ul>{~TS:Row:AppData.Cereals~}</ul>>}', {},
										(pError, pValue) =>
										{
											Expect(pError).to.not.be.an('error');
											Expect(pValue).to.equal('<ul><li>Count Chocula</li><li>Frankenberry</li></ul>');
											return fDone();
										});
								}
							);
					}
				);

			suite(
					'Context and Scope',
					function ()
					{
						test(
								'Inline template sees the Context array provided to parseTemplate.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									let tmpTemplateOutput = testPict.parseTemplate(
										'{<context says {~D:Context[1].Note~}.>}',
										{ },
										null,
										[ { Note: 'wrong' }, { Note: 'right' } ]);

									Expect(tmpTemplateOutput).to.equal('context says right.');
									return fDone();
								}
							);

						test(
								'Inline template sees the Scope object provided to parseTemplate.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									let tmpTemplateOutput = testPict.parseTemplate(
										'{<user is {~D:Scope.UserName~}.>}',
										{ },
										null,
										[ ],
										{ UserName: 'Boo' });

									Expect(tmpTemplateOutput).to.equal('user is Boo.');
									return fDone();
								}
							);

						test(
								'Inline template inside a {~TS:~} row receives the per-row Record.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.TemplateProvider.addTemplate('Row',
										'<li>{<{~D:Record.Name~} #{~D:Record.Year~}>}</li>');

									testPict.AppData.Cereals =
									[
										{ Name: 'Count Chocula', Year: 1971 },
										{ Name: 'Frankenberry',  Year: 1971 },
										{ Name: 'Booberry',      Year: 1973 }
									];

									let tmpTemplateOutput = testPict.parseTemplate(
										'<ul>{~TS:Row:AppData.Cereals~}</ul>');

									Expect(tmpTemplateOutput).to.equal(
										'<ul>'
										+ '<li>Count Chocula #1971</li>'
										+ '<li>Frankenberry #1971</li>'
										+ '<li>Booberry #1973</li>'
										+ '</ul>');
									return fDone();
								}
							);
					}
				);

			suite(
					'Composition with other expressions',
					function ()
					{
						test(
								'A registered child template hash may itself contain an inline expression.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.TemplateProvider.addTemplate('Outer',
										'<wrap>{<inner says {~D:AppData.Phrase~}.>}</wrap>');
									testPict.AppData.Phrase = 'pumpkin';

									let tmpTemplateOutput = testPict.parseTemplate('{~T:Outer~}');
									Expect(tmpTemplateOutput).to.equal('<wrap>inner says pumpkin.</wrap>');
									return fDone();
								}
							);

						test(
								'Inline template body matches the documented example exactly.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.AppData.SomeValue = 'CHOCOLATE';

									// Exact syntax from the feature ask:
									//   {<TEMPLATED CONTENT HERE, {~D:AppData.SomeValue~}.>}
									let tmpTemplateOutput = testPict.parseTemplate(
										'{<TEMPLATED CONTENT HERE, {~D:AppData.SomeValue~}.>}');

									Expect(tmpTemplateOutput).to.equal(
										'TEMPLATED CONTENT HERE, CHOCOLATE.');
									return fDone();
								}
							);

						test(
								'Inline templates compose with formatting filters.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.AppData.Invoice = { Amount: 12345.678 };

									let tmpTemplateOutput = testPict.parseTemplate(
										'{<Total: {~Dollars:AppData.Invoice.Amount~}>}');

									Expect(tmpTemplateOutput).to.equal('Total: $12,345.68');
									return fDone();
								}
							);
					}
				);
		}
	);
