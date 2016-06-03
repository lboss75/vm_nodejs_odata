function bootstrap_render(odata_client) {
    this.client = odata_client;
}

bootstrap_render.prototype.create_schema = function (params) {
    return new bootstrap_schema();
};

bootstrap_render.prototype.render = function (view_schema, rootElement) {
    var form = $('<form />');
    
    view_schema.fieldsets.forEach(function (item){
        var fieldset = $('<fieldset/>');
        item.render_control(fieldset);
        form.append(fieldset);
    });
    
    rootElement.append(form);
};

bootstrap_render.prototype.render_control = function (entity_type, control, view_schema) {
    switch(control.kind){
        case 'grid':
            view_schema.fieldsets.push(new bootstrap_grid_control(this, control));
            break;
        default:
            view_schema.fieldsets.push(new bootstrap_control());
            break;
    }
};

function bootstrap_schema() {
    this.fieldsets = [];
}

function bootstrap_control() {
    
}

bootstrap_control.prototype.render_control = function (container) {
    container.append($('<label for="exampleInputEmail1">Email address</label>'));
    container.append($('<input type="email" class="form-control" id="exampleInputEmail1" placeholder="Enter email">'));
}

function bootstrap_grid_control(render, control) {
    this.render = render;
    this.control = control;
}

bootstrap_grid_control.prototype.render_control = function (container) {
    var tablecontainer = $('<div class="table-responsive" />');   
    var table = $('<table class="table table-hover" />');
    var thead = $('<thead />');
    var tr = $('<tr />');
    this.control.columns.forEach(function (column){
        var th = $('<th />').text(column.header);
        tr.append(th);
    });
    thead.append(tr);
    table.append(thead);
    
    var tbody = $('<tbody />');
    table.append(tbody);
    
    tablecontainer.append(table);
    container.append(tablecontainer);
    
    var pThis = this;
    var serviceRoot = "odata/vm_odata.module";
    var headers = { "Content-Type": "application/json", Accept: "application/json" };
    var request = {
        requestUri: serviceRoot,
        method: "GET",
        headers: headers,
        data: null
    };

    this.render.client.request(
        request,
        function (data, response) {
             data.value.forEach(function (value) {
                var tr = $('<tr />');
                pThis.control.columns.forEach(function (column){
                    var th = $('<th />').text(value[column.field]);
                    tr.append(th);
                });
                tbody.append(tr);
             });
        },
        function (err) {
            alert("Fail: " + err.Message);
        }
    );
}