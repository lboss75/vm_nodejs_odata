module.exports = {
    create_metadata: function (source) {
        return new ODataMetadata(source); 
    }
};


var xmlWriter = require('xml-writer');
var exp = require('../phisical/expression');
var async = require('async');

function ODataMetadata(source){
    this.source = source;
}

ODataMetadata.prototype.execute = function (odata_manager, callback) {
    var owner = this.source.metadata();
    
    if(owner.modules){
        odata_manager.provider.connect(function (err, client, done) {
            if(err) {  done(err); return callback(err); }
            
            odata_manager.get_modules(
                client,
                [
                    odata_manager.MODULE.ID,
                    odata_manager.MODULE.NAMESPACE
                ],
                function (err, modules) {
                        if(err) {  done(err); return callback(err); }
                    
                    async.forEachOf(modules, function (module, index, done_callback) {
                        odata_manager.get_module_entity_types(
                            client,
                            module.id,
                            [
                                odata_manager.ENTITY_TYPE.ID,
                                odata_manager.ENTITY_TYPE.NAME
                            ],
                            function (err, entity_types) {
                                if(err) {  done(err); return callback(err); }
                                
                                module.entity_types = entity_types;
                                done_callback();
                            }
                        );
                        },
                        function (err) {
                            done();
                            
                            var xw = new xmlWriter();
                            xw.startDocument();
                            xw.startElement('edmx:Edmx')
                                .writeAttribute('Version', '4.0')
                                .writeAttribute('xmlns:edmx', 'http://docs.oasis-open.org/odata/ns/edmx');
                            xw.startElement('edmx:DataServices');
                            
                            modules.forEach(function(module){
                                xw.startElement('Schema')
                                    .writeAttribute('Namespace', module.namespace)
                                    .writeAttribute('xmlns', 'http://docs.oasis-open.org/odata/ns/edm');
                                    
                                if(module.entity_types){
                                    module.entity_types.forEach(function (entity_type) {
                                        xw.startElement('EntityType')
                                            .writeAttribute('Name', entity_type.name);
                                            
                                        xw.endElement();
                                    })
                                }
                                
                                xw.endElement();
                            })
                            
                            xw.endElement();
                            xw.endElement();   
                            xw.endDocument();
                            
                            callback(null, xw.toString());
                            return;
                        }
                    );
                });            
        });
    } else {
        callback();
    }        
};