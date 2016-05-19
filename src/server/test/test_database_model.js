var assert = require('assert'),
	postgresql = require('../phisical/database/postgresql.js');

var odata = require('../phisical/manager');
describe('Entity tests', function () {
	this.timeout(15000);
	
	it('when create simple entity model', function (done_test) {
		var odata_manager = odata.create_manager(); 
		odata_manager.provider.recreate_database(function () {
			odata_manager.module({
					name: 'testmodule',
					namespace: 'testnamespace',
					migrations: [{
						id: 1,
						command: function(migrator) {
							var entityType1 = migrator.create_entity_type({ name: 'Test1'});
							entityType1.add_property({
								name: 'Property1',
								type: 'Edm.String',
								length: 100
							});
							entityType1.add_property({
								name: 'Property2',
								type: 'Edm.Int32'
							});
							
							var container1 = migrator.create_entity_container({
								name: 'Default'
							});
							
							var entitySet1 = container1.create_entity_set({
								name: 'EntitySet1',
								type: entityType1
							});
						}
					}]
				}
			);
			odata_manager.migrate(
				function (err) {
					if(err) return done_test(err);
					
					odata_manager.modules(function (err, modules, done) {
						assert.equal (modules.length, 1);
						assert.equal (modules[0].name, 'testmodule');
						assert.equal (modules[0].namespace, 'testnamespace');
						done();
						done_test();
					});
				}
			);
		});
    });
});
