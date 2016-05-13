var assert = require('assert'),
	postgresql = require('../database/postgresql.js');

var odata = require('../manager');
describe('Entity tests', function () {
	it('when create simple entity model', function (done) {
		var odata_manager = odata.create_manager('postgresql', process.env.ODATA_TEST_DATABASE_URL);
		odata_manager.provider.recreate_database(function () {
			odata_manager.module({
					name: 'testmodule',
					namespace: 'http://test.org/testmodule',
					migrations: [{
						id: 'migration1',
						commands: function(migrator) {
							var entityType1 = migrator.createEntityType({ name: 'Test1'});
							entityType1.addProperty({
								name: 'Property1',
								type: 'String'
							});
							var entitySet1 = migrator.createEntitySet({
								name: 'EntitySet1',
								type: entityType1
							});
						}
					}]
				},
				function () {
					odata_manager.modules(function (err, modules) {
						assert.equal (modules.length, 1);
						done();
					});
				}
			);
		});
    });
});
