var exp = require('../expression');
var debug = require('debug')('vm_nodejs_odata');

module.exports = {
  expression2sql: ExpressionToSql,
  where2sql: WhereToSql,
  update2sql: UpdateToSql,
};

function ExpressionToSql(builder, context, expression) {
  if(expression.constructor.name == 'ExpressionSelect') {
    return 'SELECT '
      + ColumnsToSql(builder, context, expression.columns)
      + ' FROM '
      + SourceToSql(builder, context, expression.source);
  }
  
  throw 'Invalid expression type';
}

function ColumnsToSql(builder, context, columns) {
  return columns.map(function (column) {
    return ColumnToSql(builder, context, column);
  }).join();
}

function ColumnToSql(builder, context, column) {
  var alias = SourceAlias(builder, context, column.source);
  return alias + '.' + column.field;
}

function SourceAlias(builder, context, source) {
  if(context.aliases == undefined) {
    context.aliases = {};
  }
  
  for(var prop in context.aliases){
    if(source == context.aliases[prop]) {
      return prop;
    }
  }
  
  for(var i = 0;;++i){
    var alias = 't' + i;
    if(!context.aliases.hasOwnProperty(alias)){
      context.aliases[alias] = source;
      return alias;
    }    
  }  
}

function SourceToSql(builder, context, source) {
  if(source.constructor.name == 'ExpressionWhere') {
    return SourceToSql(builder, context, source.source) + ' WHERE ' + WhereToSql(builder, context, source.filter);
  }
  
  if(source.constructor.name == 'ExpressionFrom') {
    var alias = SourceAlias(builder, context, source);
    return source.schema + '.' + source.entityset + ' ' + alias;
  }
  
  throw 'Invalid expression type';  
}

function WhereToSql(builder, context, expression) {
  if(expression.constructor.name == 'BinaryExpression') {
    switch(expression.operation){
      case 'eq':
        return FilterExpressionToSql(builder, context, expression.left)
          + '='
          +  FilterExpressionToSql(builder, context, expression.right);  
    }
  }
  
  throw 'Invalid expression';  
}

function FilterExpressionToSql(builder, context, expression) {
  if(expression.constructor.name == 'ExpressionField') {
    var alias = SourceAlias(builder, context, expression.source);
    return alias + '.' + expression.field;
  }
  
  if(expression.constructor.name == 'ExpressionParam') {
    return builder.add_param(context, expression.name, expression.value); 
  }
    
  throw 'Invalid expression';  
}

function UpdateToSql(builder, source, context, row, filter) {
    var alias = SourceAlias(builder, context, source);
    
    var sql = 'UPDATE ' + source.schema + '.' + source.entityset + ' ' + alias + ' SET ';
    
    var fields = [];
    for (var prop in row){
        context.params.push({ name: prop, value: row[prop]});
        fields.push(prop + '=$' + context.params.length);
    }
    sql += fields.join();
    
    sql += ' WHERE ' + WhereToSql(builder, context, filter);
    
    debug('query: ' + sql + 
        ((context.params.length == 0) ? '' : (',' + context.params.map(function (item, index) {
            return '$' + (index + 1) + '=' + item.value;
        }).join())));
        
    return sql;
}
