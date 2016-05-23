module.exports = {
    create_root: function () {
        return new ODataRoot();
    }
};

var exp = require('../phisical/expression');

function ODataRoot() {
    
}


ODataRoot.prototype.metadata = function () {
    var result = {
        modules: exp.source('vm_odata', 'module')
    };
    
    return result;
};