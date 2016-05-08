function ODataManager() {
    this.modules = new Array(0);
}

ODataManager.prototype.module = function (moduleDefinition) {
    var exist = this.modules.find(function (element) { return element.name == moduleDefinition.name; });
    if (exist == undefined) {
        this.modules.push(moduleDefinition);
    }
}

ODataManager.prototype.migrate = function () {
    this.modules.forEach(function (module) {
        module.migrations.forEach(function (migration) {
            var migrator = new ODataMigrator();
            migration.commands(migrator);
        });
    });
}

function ODataMigrator() {
	this.createEntityType = function(typeDefinition) {
		return new ODataEntityType(typeDefinition);
	};
	this.createEntitySet = function(entitySetDefinition) {
		return new ODataEntitySet(entitySetDefinition);
	};
}

function ODataEntityType(entityTypeDefinition) {
	this.Name = entityTypeDefinition.name;
	this.addProperty = function(propertyDefinition) {
	};
}

function ODataEntitySet(entitySetDefinition) {
}

module.exports.ODataManager = ODataManager;