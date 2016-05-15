module.exports = {
    load_entity_set: LoadEntitySet
};

var exp = require('../expression');

function LoadEntitySet(client, entitySetId, callback) {
    client.query(
        exp
            .from('vm_odata', 'entity_set', 'e')
            .where(exp.field('e.id').eq(exp.param('entity_set_id', entitySetId)))
            .select(['e.container_id','e.name','e.entity_type_id']),
        function (err, result) {
            if(err) return callback(err);
            
            callback(err, new EntitySet(entitySetId, result[0].container_id, result[0].name,result[0].entity_type_id));
        });
}

function EntitySet(id, container_id, name, entity_type_id) {
    this.id = id;
    this.container_id = container_id;
    this.name = name;
    this.entity_type_id = entity_type_id;    
}

EntitySet.prototype.get_container = function (client, callback) {
    return require('./entity_container').load_entity_container(client, this.container_id, callback);
};

EntitySet.prototype.get_entity_type = function (client, callback) {
    return require('./entity_type').load_entity_type(client, this.entity_type_id, callback);
};

    