/*

*/
var util = require('util');

function expression() {
}

function select_expression(fields) {
	this.fields = fields;	
}
util.inherits(select_expression, expression);

expression.prototype.select = function(fields) {
	return new select_expression(fields);
}



select_expression.prototype.from = function(module, entityset) {
	return new from_expression(module, entityset);
}

select_expression.prototype.where = function(expression) {
	return new where_expression(expression);
}

expression.prototype.eq = function(left,right) {
	return new binary_expression('eq', left, right);
}

function expression_walker(expression, walker) {
	if(expression instanceof select_expression){
		if(walker.apply_select_expression != undefined){
			return walker.apply_select_expression(expression);
		}
	}
}

module.exports = {
	select = expression.prototype.select,
	expression_walker = expression_walker 
};