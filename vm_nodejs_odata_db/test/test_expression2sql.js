var vows = require('vows'),
    assert = require('assert');

var exp = require('../expression');
var postgresql = require('../database/postgresql.js');
vows.describe('Entity tests').addBatch({
    'When query simple': {
	topic : function() {
		var expression_builder = postgresql.expression_builder();
        return expression_builder.sql(
            exp
                .from('schema', 'table', 't')
                .where(
                   exp.field('t.column1').eq(
                       exp.field('t.column2')
                   ) 
                ).select(['t.column3'])
        );
	},
    'have one module': function (topic) {
        assert.equal (topic, 'SELECT t.column3 FROM schema.table t WHERE t.column1=t.column2');
    }}
}).export(module);
