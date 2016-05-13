module.exports = {
    expression_builder: expression_builder,
    create_provider: function (connectionString) {
        return new PostgreSqlProvider(connectionString);        
    }
};

var pg = require('pg');
var exp2sql = require('./expression2sql.js');
var debug = require('debug')('postgresql');

function PostgreSqlProvider(connnectionString) {
    this.provider_name = 'postgresql';
    this.connection_string = connnectionString;
}

PostgreSqlProvider.prototype.recreate_database = function (done_callback) {
    var client = new pg.Client(this.connection_string);
    client.connect(function (err, client, done) {
        if(err) {
            debug('error fetching client from pool ' + err);
            done(err);
            throw 'error fetching client from pool ' + err;
        }
        
        client.query('SELECT nspname FROM pg_catalog.pg_namespace WHERE nspname !~ \'^pg_\' AND nspname <> \'information_schema\'', function(err, result) {
            if(err) {
                 console.error('error fetching client from pool', err);
                 throw 'error fetching client from pool ' + err;
            }
            result.rows.forEach(function (item) {
                client.query('drop schema ' + item.nspname + ' cascade', function (err, result) {
                    if(err) {
                        console.error('error at delete shema ' + item, err);
                        throw 'error at delete shema ' + item + ' ' + err;
                    }
                });
            });
            client.query('CREATE SCHEMA vm_odata', function (err, result) {
                    if(err) {
                        console.error('error at create module table', err);
                        throw 'error at create module table ' + err;
                    }
                    
                    client.query('CREATE TABLE vm_odata.module(\
                        id serial NOT NULL,\
                        name character varying(64) NOT NULL,\
                        namespace character varying(255) NOT NULL,\
                        CONSTRAINT module_pkey PRIMARY KEY (id)\
                        )', function (err, result) {
                            if(err) {
                                console.error('error at create module table', err);
                                throw 'error at create module table ' + err;
                            }
                            
                            done_callback();
                        }
                    );
            });
        });
    });
};

PostgreSqlProvider.prototype.connect = function (connect_callback) {
    pg.connect(this.connection_string, function (err, client, done) { 
    //var client = new pg.Client(this.connection_string);
    //client.connect(function (err, client, result, done) {
        connect_callback(err, new PostgreSqlClient(client), done);
    });
};

function PostgreSqlClient(pg_client) {
    this.real_client = pg_client;
}

PostgreSqlClient.prototype.query = function (expression, callback) {
    var context = { builder: builder };
    var sql = builder.sql(context, expression);
    debug('query: ' + sql);
    var params = [];
    if(context.params) {
        context.params.forEach(function(item){ params.push(item.value); });
    }
    this.real_client.query(sql, params, callback);
}

PostgreSqlClient.prototype.insert = function (schema, table, rows, callback) {
    var fields = [];
    rows.forEach(function(row) {
        for (var prop in row){
            if(fields.indexOf(prop) < 0){
                fields.push(prop);
            }
        }
    });
    
    var params = [];
    var sql = 'INSERT INTO ' + schema + '.' + table + '(' + fields.join() + ') VALUES ';
    rows.forEach(function(row) {
        var values = [];
        fields.forEach(function(prop){
            params.push(row[prop]);
            values.push('$' + params.length);
        });
        
        sql += '(' + values.join() + ')';
    });
    
    debug('query: ' + sql);
    
    this.real_client.query(sql, params, callback);
}


var builder = new PostgreSqlExpressionBuilder();
PostgreSqlProvider.prototype.sql = function (expression) {
    var context = { builder: builder };
    return builder.sql(context, expression);
};

PostgreSqlExpressionBuilder.prototype.add_param = function (context, name, value){
    if(context.params == undefined){
      context.params = [ { name: name, value: value}];
    } else {
      context.params.push({ name: name, value: value});
    }
    
    var result = '$' + context.params.length;
    
    if(value.constructor.name == 'String'){
    } else {
        throw 'Invalid parameter type ' + value.constructor.name;
    }
    
    return result;
}

function PostgreSqlExpressionBuilder(){
    
}

PostgreSqlExpressionBuilder.prototype.sql = function (context, expression){
    context.builder = this;
    return exp2sql.expression2sql(
        context,
        expression);
}

function expression_builder(){
    return new PostgreSqlExpressionBuilder();
}

