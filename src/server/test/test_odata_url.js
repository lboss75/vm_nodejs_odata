var assert = require('assert'),
	postgresql = require('../phisical/database/postgresql.js');

var odata = require('../index.js');
describe('OData tests', function () {
	this.timeout(15000);
	
	it('when create simple entity model', function (done_test) {
		odata.manager.provider.recreate_database(function () {
			odata.manager.module({
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
			});
			odata.manager.migrate(
				function (err) {
					if(err) return done_test(err);
					
					var req = { method: 'GET', params: [ '$metadata' ], query: '' };
					var res = {
						set: function (header, value) {
							assert.equal (header, 'Content-Type');
							assert.equal (value, 'text/xml');
						},
						send: function (body) {
							assert.equal (body, 
'<?xml version="1.0"?>\n\
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">\
<edmx:DataServices>\
<Schema Namespace="testnamespace" xmlns="http://docs.oasis-open.org/odata/ns/edm">\
<EntityType Name="Test1"/>\
</Schema>\
</edmx:DataServices>\
</edmx:Edmx>'
							);
							done_test();
						}
					};
					odata.process_request(req, res);
				}
			);
		});
    });
});
