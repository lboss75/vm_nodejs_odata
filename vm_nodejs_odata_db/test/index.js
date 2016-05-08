var vows = require('vows'),
    assert = require('assert');
var odata = require('../index');
vows.describe('Entity tests').addBatch({
    'when create simple entity model': {
	topic : function() {
		var odata_manager = odata.manager;
		odata_manager.module(
			{
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
			});
		odata_manager.migrate();
		return odata_manager;
	},
	'we get a value which': {
		topic: function(odata_manager) {
			return odata_manager;
		},
	        'have one module': function (topic) {
        	    assert.equal (topic.modules.length, 1);
        	}
	}
    }
}).export(module);
