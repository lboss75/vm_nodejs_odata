module.exports = {
    api: new ODataAPI()
};

var parser = require('./http/parser');
var async = require('async');

function ODataAPI() {
    this.manager = require('./phisical/manager').create_manager();
}

ODataAPI.prototype.process_request = function(req, res, done){
    var pThis = this;
    if(req.method == 'GET'){
        var segments = parser.parse(req.params[0], req.query);
        var callbacks = segments.map(function (segment) {
                return function (result, callback){
                    if(segment.constructor.name == 'NamedSegment'){
                        if(segment.name == '$metadata'){
                            return callback(null, require('./http/metadata.js').create_metadata(result));
                        } else {
                            return callback(null, require('./http/member.js').create_member(result, segment));
                        }
                    }
                    
                    return callback(new Error('Invalid segment ' + segment));
                };
        });
        
        callbacks.splice(0, 0, function (callback){
            return callback(null, require('./http/root.js').create_root());
        });
                    
        
        async.waterfall(
            callbacks,
            function (err, result) {
                if(err) return done(err);
                
                result.execute(pThis.manager, function (err, body, client, done_callback) {
                    if(err) return done(err);
                    
                    body.format(pThis.manager, req.query, client, function(err, data) {
                        done_callback(err);
                        
                        if(err) return done(err);
                        
                        formatResult(req, res, data);
                        done();
                    }); 
                    
                    //done();
                });
            }
        );
    }
};

function formatResult(req, res, data) {
    if(req.headers.accept.split(',').some(function(type) {return type == 'application/json';})) {
        res.set('Content-Type', 'application/json');
        res.send(data.json(req));
    } else if(req.headers.accept.split(',').some(function(type) {return type == 'application/xml' || type == 'application/atom+xml'; })) {
        res.set('Content-Type', 'text/xml');
        res.send(data.xml(req));
    } else {
        res.set('Content-Type', 'text');
        res.send('Invalid data format');
    }
}
