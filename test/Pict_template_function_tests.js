/**
* Unit tests for the Pict Function template expression: {~Function:~} / {~F:~}
*
* Calls a function resolved from an address, passing the values resolved
* from each subsequent `:`-separated address as arguments.
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
		'Pict Function Template Expression',
		function ()
		{
			setup(
					function ()
					{
					}
				);

			suite(
					'Basic resolution',
					function ()
					{
						test(
								'Calls a zero-argument function and returns its value.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.services.MathBox =
									{
										meaning: () => 42
									};

									let tmpResult = testPict.parseTemplate(
										'The answer is {~Function:Pict.services.MathBox.meaning~}.');

									Expect(tmpResult).to.equal('The answer is 42.');
									return fDone();
								}
							);

						test(
								'Calls a function with a single addressed argument from AppData.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.services.Mirror =
									{
										echo: (pValue) => `[${pValue}]`
									};
									testPict.AppData.Name = 'Booberry';

									let tmpResult = testPict.parseTemplate(
										'{~Function:Pict.services.Mirror.echo:AppData.Name~}');

									Expect(tmpResult).to.equal('[Booberry]');
									return fDone();
								}
							);

						test(
								'Calls a function with multiple arguments resolved from different scopes.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.services.Geometry =
									{
										area: (pWidth, pHeight) => pWidth * pHeight
									};
									testPict.AppData.Box = { W: 6 };

									let tmpResult = testPict.parseTemplate(
										'Area = {~Function:Pict.services.Geometry.area:AppData.Box.W:Record.H~}',
										{ H: 7 });

									Expect(tmpResult).to.equal('Area = 42');
									return fDone();
								}
							);

						test(
								'Short alias {~F:~} behaves identically to {~Function:~}.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.services.Math2 =
									{
										add: (pA, pB) => pA + pB
									};
									testPict.AppData.A = 10;
									testPict.AppData.B = 32;

									let tmpResult = testPict.parseTemplate(
										'{~F:Pict.services.Math2.add:AppData.A:AppData.B~}');

									Expect(tmpResult).to.equal('42');
									return fDone();
								}
							);

						test(
								'Function receives `this` bound to its owner object.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.services.Counter =
									{
										base: 1000,
										offsetBy: function (pDelta) { return this.base + pDelta; }
									};

									let tmpResult = testPict.parseTemplate(
										'{~F:Pict.services.Counter.offsetBy:Record.Delta~}',
										{ Delta: 23 });

									Expect(tmpResult).to.equal('1023');
									return fDone();
								}
							);

						test(
								'Function accepts an addressed object argument and returns a derived string.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.services.Formatter =
									{
										describe: (pUser) => `${pUser.Name} (${pUser.Age})`
									};
									testPict.AppData.CurrentUser = { Name: 'Frankenberry', Age: 51 };

									let tmpResult = testPict.parseTemplate(
										'User: {~F:Pict.services.Formatter.describe:AppData.CurrentUser~}');

									Expect(tmpResult).to.equal('User: Frankenberry (51)');
									return fDone();
								}
							);
					}
				);

			suite(
					'Missing or invalid functions',
					function ()
					{
						test(
								'Missing function address logs a warning and renders empty.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									let tmpWarnings = [];
									testPict.log.warn = (pMessage) => tmpWarnings.push(pMessage);

									let tmpResult = testPict.parseTemplate(
										'before-{~Function:Pict.services.Nope.notThere:Record.X~}-after',
										{ X: 1 });

									Expect(tmpResult).to.equal('before--after');
									Expect(tmpWarnings).to.have.length(1);
									Expect(tmpWarnings[0]).to.contain('Function not found');
									Expect(tmpWarnings[0]).to.contain('Pict.services.Nope.notThere');
									Expect(tmpWarnings[0]).to.contain('{~Function:Pict.services.Nope.notThere:Record.X~}');
									return fDone();
								}
							);

						test(
								'Empty function address logs a warning and renders empty.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									let tmpWarnings = [];
									testPict.log.warn = (pMessage) => tmpWarnings.push(pMessage);

									let tmpResult = testPict.parseTemplate('[{~Function:~}]');

									Expect(tmpResult).to.equal('[]');
									Expect(tmpWarnings).to.have.length(1);
									Expect(tmpWarnings[0]).to.contain('No function address provided');
									return fDone();
								}
							);

						test(
								'Resolved non-function (a value) logs a warning and renders empty.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.AppData.NotAFunction = 'I am a string';
									let tmpWarnings = [];
									testPict.log.warn = (pMessage) => tmpWarnings.push(pMessage);

									let tmpResult = testPict.parseTemplate(
										'[{~F:AppData.NotAFunction~}]');

									Expect(tmpResult).to.equal('[]');
									Expect(tmpWarnings).to.have.length(1);
									Expect(tmpWarnings[0]).to.contain('Function not found');
									Expect(tmpWarnings[0]).to.contain('AppData.NotAFunction');
									return fDone();
								}
							);

						test(
								'Function that throws logs a warning and renders empty.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.services.Blow =
									{
										up: () => { throw new Error('kaboom'); }
									};
									let tmpWarnings = [];
									testPict.log.warn = (pMessage) => tmpWarnings.push(pMessage);

									let tmpResult = testPict.parseTemplate('[{~F:Pict.services.Blow.up~}]');

									Expect(tmpResult).to.equal('[]');
									Expect(tmpWarnings).to.have.length(1);
									Expect(tmpWarnings[0]).to.contain('Error invoking function');
									Expect(tmpWarnings[0]).to.contain('kaboom');
									return fDone();
								}
							);
					}
				);

			suite(
					'Return-value handling',
					function ()
					{
						test(
								'Function returning null renders as empty.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.services.NullSrv = { nullish: () => null };

									let tmpResult = testPict.parseTemplate(
										'[{~F:Pict.services.NullSrv.nullish~}]');

									Expect(tmpResult).to.equal('[]');
									return fDone();
								}
							);

						test(
								'Function returning undefined renders as empty.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.services.UndefSrv = { nada: () => undefined };

									let tmpResult = testPict.parseTemplate(
										'[{~F:Pict.services.UndefSrv.nada~}]');

									Expect(tmpResult).to.equal('[]');
									return fDone();
								}
							);

						test(
								'Function returning a number is stringified.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.services.Add = { add: (pA, pB) => pA + pB };

									let tmpResult = testPict.parseTemplate(
										'{~F:Pict.services.Add.add:Record.X:Record.Y~}',
										{ X: 5, Y: 9 });

									Expect(tmpResult).to.equal('14');
									return fDone();
								}
							);

						test(
								'Function returning false renders as "false".',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.services.Bool = { no: () => false };

									let tmpResult = testPict.parseTemplate(
										'flag={~F:Pict.services.Bool.no~}');

									Expect(tmpResult).to.equal('flag=false');
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
								'Function expression works inside a {~TS:~} row, with per-row Record.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.services.Geo = { area: (pW, pH) => pW * pH };
									testPict.TemplateProvider.addTemplate('Box-Row',
										'<li>{~D:Record.Name~}: {~F:Pict.services.Geo.area:Record.W:Record.H~}</li>');

									testPict.AppData.Boxes =
									[
										{ Name: 'Small', W: 2, H: 3 },
										{ Name: 'Big',   W: 6, H: 7 }
									];

									let tmpResult = testPict.parseTemplate(
										'<ul>{~TS:Box-Row:AppData.Boxes~}</ul>');

									Expect(tmpResult).to.equal(
										'<ul><li>Small: 6</li><li>Big: 42</li></ul>');
									return fDone();
								}
							);

						test(
								'Function expression composes inside an inline template.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									testPict.services.Greet =
									{
										hello: (pName) => `Hi, ${pName}`
									};
									testPict.AppData.User = { Name: 'Yummy Mummy' };

									let tmpResult = testPict.parseTemplate(
										'{<>>> {~F:Pict.services.Greet.hello:AppData.User.Name~} <<<>}');

									Expect(tmpResult).to.equal('>>> Hi, Yummy Mummy <<<');
									return fDone();
								}
							);

						test(
								'A function that resolves on Scope works.',
								function (fDone)
								{
									const testPict = new libPict(_MockSettings);
									let tmpScope =
									{
										UserName: 'Boo',
										salute: function (pGreeting) { return `${pGreeting}, ${this.UserName}!`; }
									};

									let tmpResult = testPict.parseTemplate(
										'{~F:Scope.salute:Record.Word~}',
										{ Word: 'Hello' },
										null,
										[ ],
										tmpScope);

									Expect(tmpResult).to.equal('Hello, Boo!');
									return fDone();
								}
							);
					}
				);
		}
	);
