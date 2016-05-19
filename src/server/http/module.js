module.exports = {
    create_module: function (segment) {
        return new ODataModule(segment); 
    }
};

function ODataModule(segment){
    this.module_name = segment.name;
}

ODataModule.prototype.execute = function(context, done) {
    context.get_module_by_name(
        this.module_name,
        function (err, module) {
            if(err) return done(err);
            
            done(undefined, new ModuleInformation(module));
        });
};

function ModuleInformation(module) {
    this.module = module;
}

ModuleInformation.prototype.metadata = function (params) {
    
};