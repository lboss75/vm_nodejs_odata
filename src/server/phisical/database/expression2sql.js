var exp = require('../expression');

module.exports = {
  expression2sql: ExpressionToSql,
  where2sql: WhereToSql
};

function ExpressionToSql(context, expression) {
  if(expression.constructor.name == 'ExpressionSelect') {
    return 'SELECT ' + ColumnsToSql(context, expression.columns) + ' FROM ' + SourceToSql(context, expression.source);
  }
  
  throw 'Invalid expression type';
}

function ColumnsToSql(context, columns) {
  if(columns.constructor.name == 'String') {
    return columns;
  }
  
  if(columns.constructor.name == 'Array') {
    return columns.join();
  }
  
  throw 'Invalid columns type';
}

function SourceToSql(context, source) {
  if(source.constructor.name == 'ExpressionWhere') {
    return SourceToSql(context, source.source) + ' WHERE ' + WhereToSql(context, source.filter);
  }
  
  if(source.constructor.name == 'ExpressionFrom') {
    return source.schema + '.' + source.entityset + ' ' + source.alias;
  }
  
  throw 'Invalid expression type';  
}

function WhereToSql(context, expression) {
  if(expression.constructor.name == 'BinaryExpression') {
    switch(expression.operation){
      case 'eq':
        return FilterExpressionToSql(context, expression.left) + '=' +  FilterExpressionToSql(context, expression.right);  
    }
  }
  
  throw 'Invalid expression';  
}

function FilterExpressionToSql(context, expression) {
  if(expression.constructor.name == 'ExpressionField') {
    return expression.field;
  }
  
  if(expression.constructor.name == 'ExpressionParam') {
    return context.builder.add_param(context, expression.name, expression.value); 
  }
    
  throw 'Invalid expression';  
}