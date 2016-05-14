var assert = require('assert'),
	postgresql = require('../database/postgresql.js');

var odata = require('../manager');
describe('Entity tests', function () {
	it('when create simple entity model', function (done) {
		odata.manager.provider.recreate_database(function () {
			odata.manager.module({
					name: 'testmodule',
					namespace: 'http://test.org/testmodule',
					migrations: [{
						id: 1,
						commands: function(migrator) {
							var entityType1 = migrator.createEntityType({ name: 'Test1'});
							entityType1.addProperty({
								name: 'Property1',
								type: 'String',
								length: 100
							});
							var entitySet1 = migrator.createEntitySet({
								name: 'EntitySet1',
								type: entityType1
							});
						}
					}]
				}
			);
			odata.manager.migrate(
				function () {
					odata.manager.modules(function (err, modules) {
						assert.equal (modules.length, 1);
						assert.equal (modules[0].name, 'testmodule');
						assert.equal (modules[0].namespace, 'http://test.org/testmodule');
						done();
					});
				}
			);
		});
    });
});
