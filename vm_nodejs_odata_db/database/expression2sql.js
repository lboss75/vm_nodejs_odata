var exp = require('../expression');

module.exports = {
  expression2sql: ExpressionToSql 
};

function ExpressionToSql(expression, options) {
  if(expression.constructor.name == 'ExpressionSelect') {
    return 'SELECT ' + ColumnsToSql(expression.columns) + ' FROM ' + SourceToSql(expression.source);
  }
  
  throw 'Invalid expression type';
}

function ColumnsToSql(columns) {
  if(columns.constructor.name == 'String') {
    return columns;
  }
  
  if(columns.constructor.name == 'Array') {
    return columns.join();
  }
  
  throw 'Invalid columns type';
}

function SourceToSql(source) {
  if(source.constructor.name == 'ExpressionWhere') {
    return SourceToSql(source.source) + ' WHERE ' + WhereToSql(source.filter);
  }
  
  if(source.constructor.name == 'ExpressionFrom') {
    return source.schema + '.' + source.entityset + ' ' + source.alias;
  }
  
  throw 'Invalid expression type';  
}

function WhereToSql(expression) {
  if(expression.constructor.name == 'BinaryExpression') {
    switch(expression.operation){
      case 'eq':
        return FilterExpressionToSql(expression.left) + '=' +  FilterExpressionToSql(expression.right);  
    }
  }
  
  throw 'Invalid expression';  
}

function FilterExpressionToSql(expression) {
  if(expression.constructor.name == 'ExpressionField') {
    return expression.field;
  }
    
  throw 'Invalid expression';  
}