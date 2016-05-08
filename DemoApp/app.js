var odata = require('../vm_nodejs_odata_db');
var odata_manager = odata.manager;
odata_manager.module(
    {
        name: 'testmodule',
        namespace: 'http://test.org/testmodule',
        migrations: [{
                id: 'migration1',
                commands: function (migrator) {
                    var entityType1 = migrator.createEntityType({ name: 'Test1' });
                    entityType1.addProperty({
                        name: 'Property1',
                        type: 'String'
                    });
                    var entitySet1 = migrator.createEntitySet({
                        name: 'EntitySet1',
                        type: entityType1
                    });
                }
            }]
    });
odata_manager.migrate();
console.log(odata_manager.modules.length);




var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
