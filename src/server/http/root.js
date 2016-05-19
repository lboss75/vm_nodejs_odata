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
        modules: exp.from('vm_odata', 'module', 'm')
    };
    
    return result;
};