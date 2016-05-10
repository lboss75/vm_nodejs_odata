module.exports.createProvider = function (connectionString) {
    return new PostgreSqlProvider(connectionString);
}

function PostgreSqlProvider(connnectionString) {
    this.connectionString = connnectionString;
}

PostgreSqlProvider.prototype.recreateDatabase = function () {
    var pg = require('pg');
    var client = new pg.Client(this.connectionString);
    client.connect();
    var query = client.query('CREATE TABLE items(id SERIAL PRIMARY KEY, text VARCHAR(40) not null, complete BOOLEAN)');
    query.on('end', function () { client.end(); });
}