module.exports = {
    expression_builder: expression_builder,
    create_provider: function (connectionString) {
        return new PostgreSqlProvider(connectionString);        
    }
};

var pg = require('pg');
var exp2sql = require('./expression2sql.js');
var debug = require('debug')('vm_nodejs_odata');
var odata = require('../manager');

function PostgreSqlProvider(connnectionString) {
    this.provider_name = 'postgresql';
    this.connection_string = connnectionString;
}

PostgreSqlProvider.prototype.recreate_database = function (done_callback) {
    var client = new pg.Client(this.connection_string);
    client.connect(function (err, client) {
        if(err) {
            debug('error fetching client from pool ' + err);
            return done_callback(err);
        }
        
        client.query('SELECT nspname FROM pg_catalog.pg_namespace WHERE nspname !~ \'^pg_\' AND nspname <> \'information_schema\'', function(err, result) {
            if(err) {
                 console.error('error fetching client from pool', err);
                 throw 'error fetching client from pool ' + err;
            }
            result.rows.forEach(function (item) {
                debug('drop schema ' + item.nspname + ' cascade');
                client.query('drop schema ' + item.nspname + ' cascade', function (err, result) {
                    if(err) {
                        console.error('error at delete shema ' + item, err);
                        throw 'error at delete shema ' + item + ' ' + err;
                    }
                });
            });
            client.query('\
CREATE SCHEMA vm_odata;\
CREATE TABLE vm_odata.module(\
    id serial NOT NULL,\
    name character varying(64) NOT NULL,\
    namespace character varying(255) NOT NULL,\
    last_migration integer NOT NULL DEFAULT 0,\
    CONSTRAINT module_pkey PRIMARY KEY (id)\
);\
\
CREATE TABLE vm_odata.entity_type\
(\
  id serial NOT NULL,\
  module_id integer NOT NULL,\
  name character varying(100) NOT NULL,\
  base_type character varying(256),\
  CONSTRAINT entity_type_pkey PRIMARY KEY (id),\
  CONSTRAINT fk_entity_type_module FOREIGN KEY (module_id)\
      REFERENCES vm_odata.module (id)\
      ON UPDATE NO ACTION ON DELETE NO ACTION\
);\
CREATE INDEX fki_entity_type_module ON vm_odata.entity_type USING btree (module_id);\
\
CREATE TABLE vm_odata.entity_type_property\
(\
  id serial NOT NULL,\
  entity_type_id integer,\
  order_num integer NOT NULL,\
  name character varying(100) NOT NULL,\
  type character varying(256) NOT NULL,\
  nullable boolean NOT NULL DEFAULT false,\
  CONSTRAINT entity_type_property_pkey PRIMARY KEY (id),\
  CONSTRAINT fk_entity_type_property_entity_type FOREIGN KEY (entity_type_id)\
      REFERENCES vm_odata.entity_type (id)\
      ON UPDATE NO ACTION ON DELETE NO ACTION\
);\
CREATE INDEX fki_entity_type_property_entity_type ON vm_odata.entity_type_property USING btree (entity_type_id);\
\
CREATE TABLE vm_odata.entity_container\
(\
  id serial NOT NULL,\
  module_id integer NOT NULL,\
  name character varying (100) NOT NULL,\
  base_container_id integer,\
  CONSTRAINT entity_container_pkey PRIMARY KEY (id),\
  CONSTRAINT fk_entity_container_module FOREIGN KEY (module_id)\
      REFERENCES vm_odata.module (id)\
      ON UPDATE NO ACTION ON DELETE NO ACTION,\
  CONSTRAINT fk_entity_container_entity_container FOREIGN KEY (base_container_id)\
      REFERENCES vm_odata.entity_container (id)\
      ON UPDATE NO ACTION ON DELETE NO ACTION\
);\
CREATE INDEX fk_entity_container_module ON vm_odata.entity_container USING btree (module_id);\
CREATE INDEX fk_entity_container_entity_container ON vm_odata.entity_container USING btree (base_container_id);\
\
CREATE TABLE vm_odata.entity_set\
(\
  id serial NOT NULL,\
  container_id integer NOT NULL,\
  name character varying (100) NOT NULL,\
  entity_type_id integer NOT NULL,\
  CONSTRAINT entity_set_pkey PRIMARY KEY (id),\
  CONSTRAINT fk_entity_set_entity_container FOREIGN KEY (container_id)\
      REFERENCES vm_odata.entity_container (id)\
      ON UPDATE NO ACTION ON DELETE NO ACTION,\
  CONSTRAINT fk_entity_set_entity_type FOREIGN KEY (entity_type_id)\
      REFERENCES vm_odata.entity_type (id)\
      ON UPDATE NO ACTION ON DELETE NO ACTION\
);\
CREATE INDEX fki_entity_set_entity_container ON vm_odata.entity_set USING btree (container_id);\
CREATE INDEX fki_entity_set_entity_type ON vm_odata.entity_set USING btree (entity_type_id);\
                ', function (err, result) {
                    if(err) {
                        console.error('error at create odata tables', err);
                        client.end();
                        return done_callback(err);
                    }
                    
                    client.end();
                    done_callback();
                }
            );
        });
    });
};

PostgreSqlProvider.prototype.connect = function (connect_callback) {
    pg.connect(this.connection_string, function (err, client, done) {
        if(err) {
            return connect_callback(err, undefined, done);
        }
        
        client.query('BEGIN', new function (err) {
            if(err) return connect_callback(err, undefined, done);

            var proxy = new PostgreSqlClient(client);
            connect_callback(err, proxy, function(err){
                if(err) {
                    client.query('ROLLBACK', new function () {
                        return done(err);
                    });
                }
                
                client.query('COMMIT', new function (err) {
                    return done(err);
                });
            });
        });
    });
};

function PostgreSqlClient(pg_client) {
    this.real_client = pg_client;
}

PostgreSqlClient.prototype.query = function (expression, callback) {
    var context = { builder: builder, params: [] };
    var sql = builder.sql(context, expression);
    var params = context.params.map(function (item) { return item.value; });
    debug('query: ' + sql + 
        ((params.length == 0) ? '' : (',' + params.map(function (item, index) {
            return '$' + (index + 1) + '=' + item;
        }).join())));
    this.real_client.query(sql, params, function (err, result) {
        if(err) return callback(err);
        
        callback(undefined, result.rows);
    });
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
    
    debug('query: ' + sql + 
        ((params.length == 0) ? '' : (',' + params.map(function (item, index) {
            return '$' + (index + 1) + '=' + item;
        }).join())));
    
    this.real_client.query(sql, params, callback);
}

PostgreSqlClient.prototype.update = function (source, row, filter, callback) {
    var context = { params: [] };
    var sql = builder.update_sql(source, context, row, filter);
    this.real_client.query(sql, context.params.map(function (item) {
        return item.value;
    }), callback);
}

PostgreSqlClient.prototype.get_identity = function (callback) {
    this.real_client.query('SELECT LASTVAL()', function(err, result) {
        if(err){
            return callback(err);
        }
        callback(err, result.rows.map(function (item) {
            return item.lastval;                
        }));
    });
};

PostgreSqlClient.prototype.create_schema = function (schema, callback) {
    debug('CREATE SCHEMA ' + schema);
    this.real_client.query('CREATE SCHEMA ' + schema, callback);
};

PostgreSqlClient.prototype.create_entity_set = function (odata_manager, entitySetId, callback) {
    var pThis = this;
    
    odata_manager.get_entity_set(pThis, entitySetId, 
        [
            odata_manager.ENTITY_SET.ID,
            odata_manager.ENTITY_SET.NAME,
            odata_manager.ENTITY_SET.CONTAINER_ID,
            odata_manager.ENTITY_SET.ENTITY_TYPE_ID
        ],
        function (err, entitySet) {
            odata_manager.get_container(pThis, entitySet.container_id,
            [
                odata_manager.ENTITY_CONTAINER.ID,
                odata_manager.ENTITY_CONTAINER.NAME,
                odata_manager.ENTITY_CONTAINER.MODULE_ID
            ],
            function (err, entity_container) {
                odata_manager.get_module(pThis, entity_container.module_id,
                [
                    odata_manager.MODULE.ID,
                    odata_manager.MODULE.NAME
                ],
                function (err, module) {
                    odata_manager.get_entity_type(pThis, entitySet.entity_type_id,
                    [
                        odata_manager.ENTITY_TYPE.ID,
                        odata_manager.ENTITY_TYPE.NAME,
                    ],
                    function (err, entity_type) {
                        odata_manager.get_entity_type_properties(pThis, entitySet.entity_type_id,
                        [
                            odata_manager.ENTITY_TYPE_PROPERTY.ID,
                            odata_manager.ENTITY_TYPE_PROPERTY.NAME,
                            odata_manager.ENTITY_TYPE_PROPERTY.TYPE
                        ],
                        function (err, properties) {
                            var sql = 'CREATE TABLE ' + module.name + '.' + entitySet.name + '('
                            + properties.map(function (property) { return property2sql(property); }).join()
                            + ')';
                        
                            pThis.real_client.query(sql, callback);
                        });
                    });
                });
            });
        });
};

PostgreSqlClient.prototype.escape_entity_set_schema = function (namespace) {
    return  namespace;
};

PostgreSqlClient.prototype.escape_entity_set_table = function (name) {
    return  name;
};

PostgreSqlClient.prototype.escape_entity_set_field_name = function (name) {
    return  name;
};

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
    
    switch(value.constructor.name){
        case 'String':
        case 'Number':
            break;
        default:
            throw 'Invalid parameter type ' + value.constructor.name;
    }
    
    return result;
}

function PostgreSqlExpressionBuilder(){
    
}

PostgreSqlExpressionBuilder.prototype.sql = function (context, expression){
    return exp2sql.expression2sql(
        this,
        context,
        expression);
}

PostgreSqlExpressionBuilder.prototype.where2sql = function (context, expression){
    return exp2sql.where2sql(
        this,
        context,
        expression);
}

PostgreSqlExpressionBuilder.prototype.update_sql = function (source, context, row, filter){
    return exp2sql.update2sql(
        this,
        source,
        context,
        row,
        filter);
}

function expression_builder(){
    return new PostgreSqlExpressionBuilder();
}

function property2sql(property) {
    return property.name + ' ' + propertyType2sql(property) + (property.nullable ? '' : ' NOT NULL');
}

function propertyType2sql(property) {
    switch(property.type){
        case 'Edm.String':
            return 'character varying';
        case 'Edm.Int32':
            return 'integer';
        default:
            throw 'Invalid property type ' + property.type;
    }
}