var assert = require('assert');

var exp = require('../phisical/expression');
var postgresql = require('../phisical/database/postgresql.js');

describe('SQL builder tests', function () {
    var expression_builder = postgresql.expression_builder();
    
    it('When query simple have correct sql', function () {
        var context = {};
        var t = exp.source('schema', 'table');
        var sql = expression_builder.sql(
            context,
            t.where(t.field('column1').eq(t.field('column2'))).select([t.field('column3')])
        );
        
        assert.equal (sql, 'SELECT t0.column3 FROM schema.table t0 WHERE t0.column1=t0.column2');
    });
    it('When query with parameter have correct sql', function() {
        var context = {};
        var t = exp.source('schema', 'table');
        var sql = expression_builder.sql(
            context,
            t.where(t.field('column1').eq(exp.param('test', 'value'))).select([t.field('column3')])
        );
        
        assert.equal (sql, 'SELECT t0.column3 FROM schema.table t0 WHERE t0.column1=$1');
        assert.equal (context.params.length, 1);
        assert.equal (context.params[0].name, 'test');
        assert.equal (context.params[0].value, 'value');
    });
});