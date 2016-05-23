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
                            return callback(null, require('./http/module.js').create_member(segment, result));
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
                
                result.execute(pThis.manager, function (err, body) {
                    if(err) return done(err);
                    
                    res.set('Content-Type', 'text/xml');
                    res.send(body);
                    
                    done();
                });
            }
        );
    }
};

