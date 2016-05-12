var exp2sql = require('./expression2sql.js');

function PostgreSqlProvider(connnectionString) {
    this.connectionString = connnectionString;
}

PostgreSqlProvider.prototype.recreateDatabase = function () {
    var pg = require('pg');
    var client = new pg.Client(this.connectionString);
    client.connect();
    var query = client.query('CREATE TABLE items(id SERIAL PRIMARY KEY, text VARCHAR(40) not null, complete BOOLEAN)');
    query.on('end', function () { client.end(); });
}

function PostgreSqlExpressionBuilder(){
    
}

PostgreSqlExpressionBuilder.prototype.sql = function (expression){
    return exp2sql.expression2sql(
        expression,
        {
            
        });
}

function expression_builder(){
    return new PostgreSqlExpressionBuilder();
}

module.exports = {
    expression_builder: expression_builder
};
