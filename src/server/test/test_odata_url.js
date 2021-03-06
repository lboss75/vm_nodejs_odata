var assert = require('assert'),
	postgresql = require('../phisical/database/postgresql.js'),
	async = require('async');

var odata = require('..');
describe('OData tests', function () {
	this.timeout(15000);
	
	it('when create simple entity model', function (done_test) {
		var odata_manager = odata.api.manager; 
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
			});
			odata_manager.migrate(
				function (err) {
					if(err) return done_test(err);
					
					async.series([
						function (done_step) {
							var req = { method: 'GET', params: [ '$metadata' ], query: '', accept: 'application/atom+xml,application/xml' };
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
<Schema Namespace="vm_odata" xmlns="http://docs.oasis-open.org/odata/ns/edm">\
<EntityType Name="module_type"/>\
</Schema>\
<Schema Namespace="testnamespace" xmlns="http://docs.oasis-open.org/odata/ns/edm">\
<EntityType Name="Test1"/>\
</Schema>\
</edmx:DataServices>\
</edmx:Edmx>'


									);
								}
							};
							odata.api.process_request(req, res, done_step);
						},
						function (done_step) {
							var req = {
								method: 'GET',
								params: [ 'vm_odata.module' ],
								query: {
									'$top': 2,
									'$orderby': 'name',
									'$filter': 'startswith(name, \'vm_\') eq true'
								},
								accept: 'application/json'
							};
							var res = {
								set: function (header, value) {
									assert.equal (header, 'Content-Type');
									assert.equal (value, 'application/json');
								},
								send: function (body) {
									assert.equal (body, 
'{"@odata.context":"",\
"value":[\
{"namespace":"vm_odata","name":"vm_odata","id":1},\
{"namespace":"testnamespace","name":"testmodule","id":2}\
]}'
									);
								}
							};
							odata.api.process_request(req, res, done_step);
						}], done_test);
				}
			);
		});
    });
});
