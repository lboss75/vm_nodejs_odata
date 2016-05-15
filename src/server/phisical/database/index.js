function ODataDatabaseManager(provider, connectionString) {
    if (provider == 'PostgreSql') {
        this.provider = require('./PostgreSql.js').createProvider(connectionString);
    } else {
        throw 'Invalid database provider ' + provider;
    }
}

ODataDatabaseManager.prototype.recreateDatabase = function () {
    this.provider.recreateDatabase();
}