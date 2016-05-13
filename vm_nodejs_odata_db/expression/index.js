/*

*/
var util = require('util');

module.exports = {
	from: function(schema, entityset, alias) {
		return new ExpressionFrom(schema, entityset, alias);
	},

	field: function(field, source_alias){
		return new ExpressionField(field, source_alias);
	},
	
	param: function(name, value) {
		return new ExpressionParam(name, value);
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

function ExpressionFrom(schema, entityset, alias) {
	this.schema = schema;
	this.entityset = entityset;
	this.alias = alias;	
}

ExpressionFrom.prototype.where = function(filter){
	return new ExpressionWhere(this, filter);
}

ExpressionFrom.prototype.select = function(columns){
	return new ExpressionSelect(this, columns);
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

function ExpressionField(field) {
	this.field = field;
}
util.inherits(ExpressionField, Expression);

function ExpressionParam(name, value) {
	this.name = name;
	this.value = value;
}