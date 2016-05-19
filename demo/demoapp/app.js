var fs = require('fs');
var path = require('path');
var express = require("express");
var app = express();

var odata = require('../../src/server');

app.use("/assets/:module/*", function(req,res){
  res.sendFile(__dirname + '/bower_components/' + req.params.module + '/dist/' + req.params[0]);
});

app.use("/www/*", function(req,res){
  res.sendFile(__dirname + '/public/' + req.params[0]);
});

app.use("/demo", function(req,res){
  res.sendFile(__dirname + '/views/' + "demo.html");
});

app.use("/odata/*", function(req,res){
  odata.process_request(req,res);
});

app.use("/", function(req,res){
  res.sendFile(__dirname + '/views/' + "index.html");
});

app.listen(3000,function(){
  console.log("Live at Port 3000");
});
