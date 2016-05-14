module.exports = {
    manager: new ODataManager(process.env.ODATA_DATABASE_PROVIDER, process.env.ODATA_DATABASE_URL) 
};

var exp = require('../expression');
var debug = require('debug')('odata_maanger');
var async = require('async');

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
            done(err);
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
            'vm_odata', 'module',
            [{
                'name': module2migrate.name,
                'namespace': module2migrate.namespace
            }],
            function (err, result) {
                if(err){
                    debug('Unable to inser module ' + module2migrate.name + ' ' + err);
                    done(err);
                } else {
                    client.get_identity(function (err, moduleIds) {
                        migrateModuleCommands(moduleIds[0], module2migrate, done);
                    });
                }
            });
    }
    
    function migrateModuleCommands(moduleId, module2migrate, done){
        async.forEach(module2migrate.migrations, function(migration, callback){
            doModuleMigration(moduleId, module2migrate, migration, callback);
        }, done);
    }
    
    function doModuleMigration(moduleId, module2migrate, migration, done){
        done();
    }
};


ODataManager.prototype.modules = function (callback) {
    this.provider.connect(function (err, client, done) {
        if(err){
            throw 'Unable to database connect ' + err;
        }
        client.query(
            exp.from('vm_odata', 'module', 'm').select(['m.name', 'm.namespace']),
            function (err, result) {
                callback(err, result.rows, done, client);
            });            
    });
};
