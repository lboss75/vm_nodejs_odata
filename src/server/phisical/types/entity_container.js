module.exports = {
    load_entity_container: LoadEntityContainer
};

var exp = require('../expression');

function LoadEntityContainer(client, containerId, callback) {
    client.query(
        exp
            .from('vm_odata', 'entity_container', 'c')
            .where(exp.field('c.id').eq(exp.param('entity_container_id', containerId)))
            .select(['c.module_id','c.name','c.base_container_id']),
        function (err, result) {
            if(err) return callback(err);
            
            callback(err,
             new EntityContainer(containerId,
             result[0].module_id,
             result[0].name,
             result[0].base_container_id));
        });
}

function EntityContainer(id, module_id, name, base_container_id) {
    this.id = id;
    this.module_id = module_id;
    this.name = name;
    this.base_container_id = base_container_id;    
}

EntityContainer.prototype.get_module = function (client, callback) {
    return require('./module').load_module(client, this.module_id, callback);
};
