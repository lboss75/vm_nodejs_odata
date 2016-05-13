module.exports = {
  create_manager: function (providerName, connectionString){
      return new ODataManager(providerName, connectionString);
  }  
};

var exp = require('../expression');

function ODataManager(providerName, connectionString) {
    switch(providerName){
        case 'postgresql':
            var postgresql = require('../database/postgresql.js');
            this.provider = postgresql.create_provider(connectionString);  
            break;
        default:
            throw new 'Invalid provider ' + providerName;
    }    
}

ODataManager.prototype.module = function (params, done_callback) {
    this.provider.connect(function (err, client, done) {
        if(err){
            throw 'Unable to connect database ' + err;
        }
        client.query(
            exp
                .from('vm_odata', 'module', 'm')
                .where(
                   exp.field('m.name').eq(
                       exp.param('module_name', params.name)
                   ) 
                ).select(['m.name', 'm.namespace']),
            function (err, result) {
                if(err){
                    throw 'Unable to read modules ' + err;
                }
                
                if(result.rows.length == 0) {
                    client.insert(
                        'vm_odata', 'module',
                        [{
                            'name': params.name,
                            'namespace': params.namespace
                        }],
                        function (err, result) {
                            if(err){
                                throw 'Unable to inser module ' + err;
                            }
                            
                            done();
                            done_callback();
                        }
                    );
                }
            });
    });
};

ODataManager.prototype.modules = function (callback) {
    this.provider.connect(function (err, client, done) {
        if(err){
            throw 'Unable to database connect ' + err;
        }
        client.query(
            exp.from('vm_odata', 'module', 'm').select(['m.name', 'm.namespace']),
            function (err, result) {
                callback(err, result.rows);
            });            
    });
};
