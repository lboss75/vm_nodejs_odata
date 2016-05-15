module.exports = {
    load_module: LoadModule
};

var exp = require('../expression');

function LoadModule(client, moduleId, callback) {
    client.query(
        exp
            .from('vm_odata', 'module', 'm')
            .where(exp.field('m.id').eq(exp.param('module_id', moduleId)))
            .select(['m.name','m.namespace']),
        function (err, result) {
            if(err) return callback(err);
            
            callback(err, new Module(moduleId, result[0].name, result[0].namespace));
        });
}

function Module(id, name, namespace) {
    this.id = id;
    this.name = name;
    this.namespace = namespace;    
}

