module.exports = {
    create_manager: function () {
        return new ODataManager(process.env.ODATA_DATABASE_PROVIDER, process.env.ODATA_DATABASE_URL);
    } 
};

var debug = require('debug')('odata_maanger');
var async = require('async');
var exp = require('../expression');
var odata_migrator = require('./migrator');

const ODATA_MODULE_NAME = 'vm_odata';
function ODataManager(providerName, connectionString) {
    this.modules2migrate = [{
        name: ODATA_MODULE_NAME,
        namespace: ODATA_MODULE_NAME,
        _skip_create: true,
        migrations: [{
            id: 1,
            command: function(migrator) {
                var moduleType = migrator.create_entity_type({ name: 'module_type'});
                moduleType.add_property({
                    name: 'id',
                    type: 'Edm.Int32'
                });
                moduleType.add_property({
                    name: 'name',
                    type: 'Edm.String',
                    length: 100
                });
                moduleType.add_property({
                    name: 'namespace',
                    type: 'Edm.String',
                    length: 100
                });
                
                var container1 = migrator.create_entity_container({
                    name: 'Default',
                    _skip_create: true
                });
                
                var entitySet1 = container1.create_entity_set({
                    name: 'module',
                    type: moduleType
                });
            }
        }]
    }];
    switch(providerName){
        case 'postgresql':
            var postgresql = require('../database/postgresql.js');
            this.provider = postgresql.create_provider(connectionString);  
            break;
        default:
            throw new 'Invalid provider ' + providerName;
    }    
}

ODataManager.prototype.module = function (module) {
    this.modules2migrate.push(module);
};

ODataManager.prototype.migrate = function (done_callback) {
    var pThis = this;
    
    this.provider.connect(function (err, client, done) {
        if(err) return done_callback(err);

    pThis.get_modules(client, [ pThis.MODULE.NAME ], 
        function (err, modules) {
            if(err){
                debug('Unable to read modules ' + err);
                done(err);
                return done_callback(err);
            }
        
            migrate_modules(pThis.modules2migrate, modules, function (err) {
                done_callback(err, client);
                done(err);
            }, client);
        });
    });
    function migrate_modules(modules2migrate, modules, done, client) {
        var tasks = [];
        modules2migrate.forEach(function (module2migrate){
            var exist = false;
            modules.every(function (existModule) {
                if(existModule.name == module2migrate.name){
                    tasks.push(function (callback) {
                        migrateModule(existModule, module2migrate, callback);
                    });
                    exist = true;
                    return false;
                }
                
                return true;
            });
            if(!exist){
                tasks.push(function (callback) {
                    insertModule(module2migrate, callback, client);
                });
            }
        });
        async.series(tasks, function (err){
            done(err);
        });
    }
    
    function migrateModule(existModule, module2migrate, done) {
        return done();
    }
    
    function insertModule(module2migrate, done, client) {
        client.insert(
            ODATA_MODULE_NAME, 'module',
            [{
                'name': module2migrate.name,
                'namespace': module2migrate.namespace
            }],
            function (err, result) {
                if(err){
                    debug('Unable to insert module ' + module2migrate.name + ' ' + err);
                    return done(err);
                }
                
                client.get_identity(function (err, moduleIds) {
                    if(module2migrate._skip_create){
                        migrateModuleCommands(moduleIds[0], module2migrate, 0, client, done);
                    } else {
                        client.create_schema(
                            module2migrate.name,
                            function (err) {
                                if(err) return done(err);
                                
                                migrateModuleCommands(moduleIds[0], module2migrate, 0, client, done);
                            });
                    }
                });
            });
    }
    
    function migrateModuleCommands(moduleId, module2migrate, last_migration, client, done){
        async.forEach(module2migrate.migrations, function(migration, callback){
            if(last_migration < migration.id){
                last_migration = migration.id;
                doModuleMigration(moduleId, module2migrate, migration, client, callback);
            }
        }, function(err){
            if(err) return done(err);
            
            var m = exp.source(pThis.MODULE.SCHEMA, pThis.MODULE.TABLE);
            client.update(
                m,
                {
                    'last_migration': last_migration
                },
                m.field('id').eq(exp.param('moduleId', moduleId)),
                done
            );
        });
    }
    
    function doModuleMigration(moduleId, module2migrate, migration, client, done){
        var migrator = odata_migrator.create_migrator(pThis, moduleId, client);
        migration.command(migrator);
        migrator.migrate(done);
    }
};

ODataManager.prototype.MODULE = {
	SCHEMA: 'vm_odata',
	TABLE: 'module',
	ID: 'id',
	NAME: 'name',
	NAMESPACE: 'namespace',
    LAST_MIGRATION: 'last_migration'
};

ODataManager.prototype.ENTITY_TYPE = {
	SCHEMA: 'vm_odata',
	TABLE: 'entity_type',
	ID: 'id',
	MODULE_ID: 'module_id',
	NAME: 'name',
	BASE_TYPE: 'base_type'
};

ODataManager.prototype.ENTITY_TYPE_PROPERTY = {
	SCHEMA: 'vm_odata',
	TABLE: 'entity_type_property',
	ID: 'id',
	ENTITY_TYPE_ID: 'entity_type_id',
	NAME: 'name',
	TYPE: 'type',
	NULLABLE: 'nullable'
};

ODataManager.prototype.ENTITY_CONTAINER = {
	SCHEMA: 'vm_odata',
	TABLE: 'entity_container',
	ID: 'id',
	MODULE_ID: 'module_id',
	NAME: 'name',
	BASE_CONTAINER_ID: 'base_container_id'
};

ODataManager.prototype.ENTITY_SET = {
	SCHEMA: 'vm_odata',
	TABLE: 'entity_set',
	ID: 'id',
	CONTAINER_ID: 'container_id',
	NAME: 'name',
	ENTITY_TYPE_ID: 'entity_type_id'
};

ODataManager.prototype.get_entity_set_source = function(client, entitySetId, done) {
    var odata_manager = this;
    var m = exp.source(odata_manager.MODULE.SCHEMA, odata_manager.MODULE.TABLE);
    var e = exp.source(odata_manager.ENTITY_SET.SCHEMA, odata_manager.ENTITY_SET.TABLE);
    var c = exp.source(odata_manager.ENTITY_CONTAINER.SCHEMA, odata_manager.ENTITY_CONTAINER.TABLE);
    client.query(
        e
        .join(c.join(m, m.field(odata_manager.MODULE.ID).eq(c.field(odata_manager.ENTITY_CONTAINER.MODULE_ID))),
            c.field(odata_manager.ENTITY_CONTAINER.ID).eq(e.field(odata_manager.ENTITY_SET.CONTAINER_ID)))            
        .where(
            e.field(odata_manager.ENTITY_SET.ID).eq(exp.param('entitySetId', entitySetId))
        )
        .select([
            e.field(odata_manager.ENTITY_SET.NAME),
            m.field(odata_manager.MODULE.NAMESPACE)
        ]),
    function (err, result) {
        if(err) return done(err);
        
        done(err, exp.source(
            client.escape_entity_set_schema(result[0].namespace),
            client.escape_entity_set_table(result[0].name)));
    });
};

ODataManager.prototype.get_entity_set_properties = function(client, source, property, done) {
    switch(property.type){
        case 'Edm.String':
        case 'Edm.Int32':
            return done(null, source.field(client.escape_entity_set_field_name(property.name)));
        default:
            return done(new Error('Invalid property type ' + property.type));
    }
};

ODataManager.prototype.get_modules = function (client, fields, callback) {
    var m = exp.source(this.MODULE.SCHEMA, this.MODULE.TABLE);
    client.query(
        m.select(fields.map(function (field) {
            return m.field(field);
        })),
        function (err, result) {
            if(err) return callback(err);
            
            callback(err, result);
        });
};

ODataManager.prototype.get_entity_set = function (client, entitySetId, fields, callback) {
    var s = exp.source(this.ENTITY_SET.SCHEMA, this.ENTITY_SET.TABLE);
    client.query(
        s
        .where(s.field(this.ENTITY_SET.ID).eq(exp.param('entitySetId', entitySetId)))
        .select(fields.map(function (field) {
            return s.field(field);
        })),
        function (err, result) {
            if(err) return callback(err);
            
            callback(err, result[0]);
        });
};

ODataManager.prototype.get_container = function (client, containerId, fields, callback) {
    var c = exp.source(this.ENTITY_CONTAINER.SCHEMA, this.ENTITY_CONTAINER.TABLE);
    client.query(
        c
        .where(c.field(this.ENTITY_CONTAINER.ID).eq(exp.param('containerId', containerId)))
        .select(fields.map(function (field) {
            return c.field(field);
        })),
        function (err, result) {
            if(err) return callback(err);
            
            callback(err, result[0]);
        });
};

ODataManager.prototype.get_module = function (client, moduleId, fields, callback) {
    var m = exp.source(this.MODULE.SCHEMA, this.MODULE.TABLE);
    client.query(
        m
        .where(m.field(this.MODULE.ID).eq(exp.param('moduleId', moduleId)))
        .select(fields.map(function (field) {
            return m.field(field);
        })),
        function (err, result) {
            if(err) return callback(err);
            
            callback(err, result[0]);
        });
};

ODataManager.prototype.get_entity_type = function (client, entityTypeId, fields, callback) {
    var t = exp.source(this.ENTITY_TYPE.SCHEMA, this.ENTITY_TYPE.TABLE);
    client.query(
        t
        .where(t.field(this.ENTITY_TYPE.ID).eq(exp.param('entityTypeId', entityTypeId)))
        .select(fields.map(function (field) {
            return t.field(field);
        })),
        function (err, result) {
            if(err) return callback(err);
            
            callback(err, result[0]);
        });
};

ODataManager.prototype.get_entity_type_properties = function (client, entityTypeId, fields, callback) {
    var p = exp.source(this.ENTITY_TYPE_PROPERTY.SCHEMA, this.ENTITY_TYPE_PROPERTY.TABLE);
    client.query(
        p
        .where(p.field(this.ENTITY_TYPE_PROPERTY.ENTITY_TYPE_ID).eq(exp.param('entityTypeId', entityTypeId)))
        .select(fields.map(function (field) {
            return p.field(field);
        })),
        function (err, result) {
            if(err) return callback(err);
            
            callback(err, result);
        });
};


ODataManager.prototype.get_module_entity_types = function (client, moduleId, fields, callback) {
    var t = exp.source(this.ENTITY_TYPE.SCHEMA, this.ENTITY_TYPE.TABLE);
    client.query(
        t
        .where(t.field(this.ENTITY_TYPE.MODULE_ID).eq(exp.param('moduleId', moduleId)))
        .select(fields.map(function (field) {
            return t.field(field);
        })),
        function (err, result) {
            if(err) return callback(err);
            
            callback(err, result);
        });
};
