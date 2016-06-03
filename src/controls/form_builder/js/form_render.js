function render_form(context, entity_type, view_data, rootElement) {
    var view_schema = context.create_schema();
    view_data.controls.forEach(function (control) {
        context.render_control(entity_type, control, view_schema);
    });
    
    context.render(view_schema, rootElement);
}

