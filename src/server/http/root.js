module.exports = {
    create_root: function () {
        return new ODataRoot();
    }
};

var exp = require('../phisical/expression');
var async = require('async');
var xmlWriter = require('xml-writer');

function ODataRoot() {
    
}


ODataRoot.prototype.metadata = function (odata_manager, callback) {
    odata_manager.provider.connect(function (err, client, done) {
        if(err) return callback(err);
        
        callback(null, new ODataRootMetadata(), client, done);
    });
};

ODataRoot.prototype.get_by_name = function (odata_manager, member_name, done_callback) {
    var pos = member_name.indexOf('.');
    var schema = member_name.substring(0, pos);
    var entitySetName = member_name.substring(pos + 1);
    
    odata_manager.provider.connect(function (err, client, done) {
        if(err) return done_callback(err);
        
        var m = exp.source(odata_manager.MODULE.SCHEMA, odata_manager.MODULE.TABLE);
        var e = exp.source(odata_manager.ENTITY_SET.SCHEMA, odata_manager.ENTITY_SET.TABLE);
        var c = exp.source(odata_manager.ENTITY_CONTAINER.SCHEMA, odata_manager.ENTITY_CONTAINER.TABLE);
        client.query(
            e
            .join(c.join(m, m.field(odata_manager.MODULE.ID).eq(c.field(odata_manager.ENTITY_CONTAINER.MODULE_ID))),
                c.field(odata_manager.ENTITY_CONTAINER.ID).eq(e.field(odata_manager.ENTITY_SET.CONTAINER_ID)))            
            .where(
                e.field(odata_manager.ENTITY_SET.NAME).eq(exp.param('entitySetName', entitySetName)),
                m.field(odata_manager.MODULE.NAMESPACE).eq(exp.param('schema', schema))
            )
            .select([
                e.field(odata_manager.ENTITY_SET.ID),
                e.field(odata_manager.ENTITY_SET.ENTITY_TYPE_ID)
            ]),
            function (err, result) {
                if(err) { done(err); return done_callback(err); }
                
                if(result.length == 0){
                    var fail = new Error('Name ' + member_name + 'not found');
                    done(fail);
                    return done_callback(fail);
                }
                
                done_callback(null, new ODataEntitySet(result[0].id, result[0].entity_type_id), client, done);
            });
    });
};

function ODataEntitySet(entityId, entity_type_id) {
    this.id = entityId;
    this.entity_type_id = entity_type_id;
}

ODataEntitySet.prototype.format = function (odata_manager, params, client, done) {
    var pThis = this;
    
    odata_manager.get_entity_set_source(client, this.id, function (err, source) {
        if(err) return done(err);
        
        var p = exp.source(odata_manager.ENTITY_TYPE_PROPERTY.SCHEMA, odata_manager.ENTITY_TYPE_PROPERTY.TABLE);
        client.query(
            p
            .where(p.field(odata_manager.ENTITY_TYPE_PROPERTY.ENTITY_TYPE_ID).eq(exp.param('entityTypeId', pThis.entity_type_id)))
            .select([
                	p.field(odata_manager.ENTITY_TYPE_PROPERTY.NAME),
	                p.field(odata_manager.ENTITY_TYPE_PROPERTY.TYPE),
	                p.field(odata_manager.ENTITY_TYPE_PROPERTY.NULLABLE)
            ]),
            function (err, result) {
                if(err) return done(err);
                
                var result_fields = [];
                async.forEachOf(result, function (property, index, callback) {
                    odata_manager.get_entity_set_properties(client, source, property, function (err, fields) {
                        if(err) return callback(err);
                        
                        result_fields.push(fields);
                        callback();
                    }); 
                }, function (err) {
                    if(err) return done(err);
                    
                    client.query(source.select(result_fields), function (err, result_data) {
                        if(err) return done(err);
                        
                        done(null, {
                            xml: function (req) { return toXml('', result_data);},
                            json:  function (req) { return toJson('', result_data);}
                        });
                    });
                });
            });
    });
};

function toXml(base_url, data) {
    var xw = new xmlWriter();
    xw.startDocument();
    xw.startElement('feed')
        .writeAttribute('xml:base', data.base_url)
        .writeAttribute('xmlns', 'http://www.w3.org/2005/Atom');
    data.forEach(function (item) {
        xw.startElement('entity');
        for(var p in item){
            xw.startElement(p);
            xw.text(item[p]);
            xw.endElement();
        }
        xw.endElement();
    });
    xw.endElement();   
    xw.endDocument();
    
    return xw.toString();
}

function toJson(base_url, data) {
    var body = {
        "@odata.context": base_url,
        "value": data
    };
    
    return JSON.stringify(body);
}

function ODataRootMetadata() {
}

ODataRootMetadata.prototype.format = function (odata_manager, params, client, done) {
    odata_manager.get_modules(
        client,
        [
            odata_manager.MODULE.ID,
            odata_manager.MODULE.NAMESPACE
        ],
        function (err, modules) {
            if(err) return done(err);
        
            async.forEachOf(modules, function (module, index, done_callback) {
                odata_manager.get_module_entity_types(
                    client,
                    module.id,
                    [
                        odata_manager.ENTITY_TYPE.ID,
                        odata_manager.ENTITY_TYPE.NAME
                    ],
                    function (err, entity_types) {
                        if(err) return done(err);
                    
                        module.entity_types = entity_types;
                        done_callback();
                    }
                );
            },
            function (err) {
                if(err) return done(err);
                
                modules.xml = function () {
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
                    
                    return xw.toString();
                }
                
                done(null, modules);
            });
        }
    );
};