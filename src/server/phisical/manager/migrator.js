module.exports = {
    create_migrator: function (odata_manager, module_id, client) {
        return new ODataMigrator(odata_manager, module_id, client);
    } 
};

var async = require('async');

function ODataMigrator(odata_manager, module_id, client) {
    this.odata_manager = odata_manager;
    this.module_id = module_id;
    this.client = client;
    this.commands = [];
}

ODataMigrator.prototype.create_entity_type = function (entityType){
    var cmd = new CreateEntityTypeCommand(entityType);
    this.commands.push(cmd);
    return cmd;
};

function CreateEntityTypeCommand(entityType) {
    this.entity_type = entityType;
    this.properties = [];
}

CreateEntityTypeCommand.prototype.add_property = function (property) {
    this.properties.push(property);
};

CreateEntityTypeCommand.prototype.execute = function (migrate_context, done) {
    var pThis = this;
    
    migrate_context.client.insert(
      'vm_odata', 'entity_type',
      [
          {
              module_id: migrate_context.module_id,
              name: this.entity_type.name
          }
      ], function (err) {
            if(err) return done(err);
          
            migrate_context.client.get_identity(function (err, result) {
                pThis.id = result[0];
                async.forEachOf(pThis.properties, function (property, index, callback) {
                    migrate_context.client.insert(
                    'vm_odata', 'entity_type_property',
                    [
                        {
                            entity_type_id: result[0],
                            order_num: index,
                            name: property.name,
                            type: property.type,
                            nullable: property.nullable || true
                        }
                    ], callback);
                }, done);
            });          
      });
};

ODataMigrator.prototype.create_entity_container = function (containerInfo){
    var cmd = new CreateEntityContainerCommand(containerInfo);
    this.commands.push(cmd);
    return cmd;
};

function CreateEntityContainerCommand(containerInfo) {
    this._skip_create = containerInfo._skip_create;
    this.container = containerInfo;
    this.entity_sets = [];
}

CreateEntityContainerCommand.prototype.create_entity_set = function (entitySet){
    var cmd = new CreateEntitySetCommand(entitySet);
    this.entity_sets.push(cmd);
    return cmd;
};

CreateEntityContainerCommand.prototype.execute = function (migrate_context, done) {
    var pThis = this;
    
    migrate_context.client.insert(
      'vm_odata', 'entity_container',
      [
          {
              module_id: migrate_context.module_id,
              name: this.container.name
          }
      ], function (err) {
            if(err) return done(err);
          
            migrate_context.client.get_identity(function (err, result) {
                async.forEachOf(pThis.entity_sets, function (entity_set, index, callback) {
                    migrate_context.client.insert(
                    'vm_odata', 'entity_set',
                    [
                        {
                            container_id: result[0],
                            name: entity_set.entity_set.name,
                            entity_type_id: entity_set.entity_set.type.id
                        }
                    ],
                    function (err) {
                        if(err) return callback(err);
                        
                        migrate_context.client.get_identity(function (err, result) {
                            if(err) return callback(err);
                            
                            if(pThis._skip_create){
                                callback();
                            } else {
                                migrate_context.client.create_entity_set(migrate_context.odata_manager, result[0], callback);
                            }
                        });
                    });
                }, done);
            });          
      });
};

function CreateEntitySetCommand(entitySet) {
    this.entity_set = entitySet;
}

ODataMigrator.prototype.migrate = function (done){
    var migrate_context = new ODataMigrateContext(this.odata_manager, this.module_id, this.client); 
    async.forEachOf(this.commands, function (command, index, callback) {
        command.execute(migrate_context, callback);
    }, done);
};

function ODataMigrateContext(odata_manager, module_id, client){
    this.odata_manager = odata_manager;
    this.module_id = module_id;
    this.client = client;
}

