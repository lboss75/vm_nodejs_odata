

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