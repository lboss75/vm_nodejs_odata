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
    this.modules2migrate = [];
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
    
    this.modules(function (err, modules, done, client) {
        if(err){
            debug('Unable to read modules ' + err);
            return done_callback(err);
        }
        
        migrate_modules(pThis.modules2migrate, modules, function (err) {
            done(err);
            done_callback(err);
        }, client);
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
                    client.create_schema(
                        module2migrate.name,
                        function (err) {
                            if(err) return done(err);
                            
                            migrateModuleCommands(moduleIds[0], module2migrate, 0, client, done);
                        });
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
            
            client.update(
                ODATA_MODULE_NAME, 'module', 'm',
                {
                    'last_migration': last_migration
                },
                exp.field('m.id').eq(exp.param('moduleId', moduleId)),
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
	ALIAS: 'm',
	ID: 'id',
	NAME: 'name',
	NAMESPACE: 'namespace'
};

ODataManager.prototype.ENTITY_TYPE = {
	SCHEMA: 'vm_odata',
	TABLE: 'entity_type',
	ALIAS: 't',
	ID: 'id',
	MODULE_ID: 'module_id',
	NAME: 'name',
	BASE_TYPE: 'base_type'
};

ODataManager.prototype.modules = function (callback) {
    this.provider.connect(function (err, client, done) {
        if(err) return callback(err);
        
        client.query(
            exp.from(ODATA_MODULE_NAME, 'module', 'm').select(['m.name', 'm.namespace','m.last_migration']),
            function (err, result) {
                callback(err, result, done, client);
            });            
    });
};

ODataManager.prototype.get_entity_set = function (client, entitySetId, callback) {
    require('../types/entity_set.js').load_entity_set(client, entitySetId, callback);
};

ODataManager.prototype.get_modules = function (client, fields, callback) {
    client.query(
        exp
            .from(this.MODULE.SCHEMA, this.MODULE.TABLE, this.MODULE.ALIAS)
            .select(fields),
        function (err, result) {
            if(err) return callback(err);
            
            callback(err, result);
        });
};

ODataManager.prototype.get_module_entity_types = function (client, moduleId, fields, callback) {
    client.query(
        exp
            .from(this.ENTITY_TYPE.SCHEMA, this.ENTITY_TYPE.TABLE, this.ENTITY_TYPE.ALIAS)
            .where(exp.field(this.ENTITY_TYPE.ALIAS + '.' + this.ENTITY_TYPE.MODULE_ID).eq(exp.param('module_id', moduleId)))
            .select(fields),
        function (err, result) {
            if(err) return callback(err);
            
            callback(err, result);
        });
};
