module.exports = {
    parse: function (url, query) {
        return parse_url(url, query);
    }    
};

function parse_url(url, query) {
    var state = { url: url, position: 0 };
    var result = [];
    while(state.position < url.length){
        var segment = parseSegment(state);
        result.push(segment);
    }
        
    return result;
}

function parseSegment(state) {
    var name = parseName(state);
    if(state.position >= state.url.length){
        return new NamedSegment(name);
    }
    
    if(state.url[state.position] == '/'){
        state.position++;
        return new NamedSegment(name);
    }
    
    if(state.url[state.position] == '('){
        state.position++;
        var keyPredicates = parseKeyPredicates(state);
        return new KeyPredicateSegment(name, keyPredicates);
    }
    
    throw 'Invalid segment ' + state.url.substring(state.position);
}

function parseName(state) {
    if(state.url[state.position] == '$' || state.url[state.position] == '_' || isAlphaNumeric(state.url, state.position)){
        var start = state.position;
        do{
            state.position++;
        } while(state.position < state.url.length
         && (state.url[state.position] == '_' || state.url[state.position] == '.' || isAlphaNumeric(state.url, state.position)));
        
        return state.url.substring(start, state.position);
    }
    
    throw 'Invalid segment ' + state.url.substring(state.position);
}

function parseKeyPredicates(state){
    var result = [];
    for(;;){
        var name = parseName(state);
        
        if(state.position >= state.url.length){
            throw 'Unexpected end of URL during parse name of key predicate';
        }
    
        if(state.url[state.position] == ')'){
            state.position++;
            result.push({value: name});
            break;
        }
        
        if(state.url[state.position] == '='){
            state.position++;
            var value = parseValue(state);
            if(state.position >= state.url.length){
                throw 'Unexpected end of URL during parse value of key predicate';
            }
        
            if(state.url[state.position] == ')'){
                state.position++;
                result.push({name: name, value: value});
                break;
            }
            
            if(state.url[state.position] == ','){
                state.position++;
                result.push({name: name, value: value});
                continue;
            }
            
            throw 'Unexpected string during parse value of key predicate: ' + state.url.substring(state.position);
        }
    }
    
    return result;
}

function isAlphaNumeric(str, i) {
    var code = str.charCodeAt(i);
    if (!(code > 47 && code < 58) && // numeric (0-9)
        !(code > 64 && code < 91) && // upper alpha (A-Z)
        !(code > 96 && code < 123)) { // lower alpha (a-z)
        return false;
    }
    return true;
}

function isNumeric(str, i) {
    var code = str.charCodeAt(i);
    if (!(code > 47 && code < 58)) { // numeric (0-9)
        return false;
    }
    
    return true;
}

function parseValue(state) {
    if(state.url[state.position] == '\''){
        state.position++;
        var start = state.position;
        while(state.position < state.url.length){
            if(state.url[state.position] == '\''){
                state.position++;
                break;
            }
            
            state.position++;
        }        
        return state.url.substring(start, state.position);
    }
    
    if(isNumeric(state.url,state.position)){
        var start = state.position;
        while(state.position < state.url.length && isNumeric(state.url, state.position)){
            state.position++;
        }        
        return parseInt(state.url.substring(start, state.position), 10);
    }
    
    throw 'Invalid value parse ' + state.url.substring(state.position);
}

function NamedSegment(name) {
    this.name = name;
}

