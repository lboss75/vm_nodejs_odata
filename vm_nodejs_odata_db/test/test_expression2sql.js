var assert = require('assert');

var exp = require('../expression');
var postgresql = require('../database/postgresql.js');

describe('SQL builder tests', function () {
    var expression_builder = postgresql.expression_builder();
    
    it('When query simple have correct sql', function () {
        var context = {};
        var sql = expression_builder.sql(
            context,
            exp
                .from('schema', 'table', 't')
                .where(
                   exp.field('t.column1').eq(
                       exp.field('t.column2')
                   ) 
                ).select(['t.column3'])
        );
        
        assert.equal (sql, 'SELECT t.column3 FROM schema.table t WHERE t.column1=t.column2');
    });
    it('When query with parameter have correct sql', function() {
        var context = {};
        var sql = expression_builder.sql(
                context,
                exp
                    .from('schema', 'table', 't')
                    .where(
                    exp.field('t.column1').eq(
                        exp.param('test', 'value')
                    ) 
                    ).select(['t.column3'])
                );
        
        assert.equal (sql, 'SELECT t.column3 FROM schema.table t WHERE t.column1=$1');
        assert.equal (context.params.length, 1);
        assert.equal (context.params[0].name, 'test');
        assert.equal (context.params[0].value, 'value');
    });
});