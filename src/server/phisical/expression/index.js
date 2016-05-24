/*

*/
var util = require('util');

module.exports = {
	param: function(name, value) {
		return new ExpressionParam(name, value);
	},
	
	source : function (schema, entityset) {
		return new ExpressionFrom(schema, entityset);
	}
};

function Expression() {
}

Expression.prototype.eq = function(right) {
	return new BinaryExpression(this, 'eq', right);
}

function BinaryExpression(left, operation, right) {
	this.left = left;
	this.operation = operation;
	this.right = right;
}

function ExpressionFrom(schema, entityset) {
	this.schema = schema;
	this.entityset = entityset;
}

ExpressionFrom.prototype.field = function(name){
	return new ExpressionField(this, name);
}

ExpressionFrom.prototype.where = function(filter){
	return new ExpressionWhere(this, filter);
}

ExpressionFrom.prototype.select = function(columns){
	return new ExpressionSelect(this, columns);
}

ExpressionFrom.prototype.join = function(source, filter){
	return new ExpressionJoin(this, source, filter);
}

function ExpressionWhere(source, filter) {
	this.source = source;
	this.filter = filter;
}

ExpressionWhere.prototype.select = function(columns){
	return new ExpressionSelect(this, columns);
}

function ExpressionSelect(source, columns) {
	this.source = source;
	this.columns = columns;
}

function ExpressionField(source, field) {
	this.source = source;
	this.field = field;
}
util.inherits(ExpressionField, Expression);

function ExpressionParam(name, value) {
	this.name = name;
	this.value = value;
}

function ExpressionJoin(left, right, filter) {
	this.left = left;
	this.right = right;
	this.filter = filter;
}

ExpressionJoin.prototype.where = function(filter){
	return new ExpressionWhere(this, filter);
}
