module.exports = {
    load_entity_properties: LoadEntityProperties
};

var exp = require('../expression');

function LoadEntityProperties(client, entityTypeId, callback) {
    client.query(
        exp
            .from('vm_odata', 'entity_type_property', 'p')
            .where(exp.field('p.entity_type_id').eq(exp.param('entity_type_id', entityTypeId)))
            .select(['p.id', 'p.name','p.type','p.nullable']),
        function (err, result) {
            if(err) return callback(err);
            
            callback(err, result.map(function (row) {
                return new EntityTypeProperty(row.id, entityTypeId, row.name, row.type, row.nullable);
            }));
        });
}

function EntityTypeProperty(id, entity_type_id, name, type, nullable) {
    this.id = id;
    this.entity_type_id = entity_type_id;
    this.name = name;
    this.type = type;
    this.nullable = nullable;
}
