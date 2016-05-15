module.exports = {
    load_entity_type: LoadEntityType
};

var exp = require('../expression');

function LoadEntityType(client, entityTypeId, callback) {
    client.query(
        exp
            .from('vm_odata', 'entity_type', 't')
            .where(exp.field('t.id').eq(exp.param('entity_type_id', entityTypeId)))
            .select(['t.module_id','t.name','t.base_type']),
        function (err, result) {
            if(err) return callback(err);
            
            callback(err, new EntityType(entityTypeId, result[0].module_id, result[0].name,result[0].base_type));
        });
}

function EntityType(id, module_id, name, base_type) {
    this.id = id;
    this.module_id = module_id;
    this.name = name;
    this.base_type = base_type;    
}

EntityType.prototype.get_properties = function (client, callback) {
    return require('./entity_property').load_entity_properties(client, this.id, callback);
};

    