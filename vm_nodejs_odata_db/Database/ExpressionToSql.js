var exp = require('../Expressions/Expression.js');

function ExpressionToSql(expression) {
  
  var walker = new ExpressionToSqlWalker();
  exp.expression_walker(expression, walker);
  
  return walker.sql();
}