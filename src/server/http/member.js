module.exports = {
    create_member: function (owner, segment) {
        return new ODataMember(owner, segment); 
    }
};

function ODataMember(owner, segment) {
    this.owner = owner;
    this.member_name = segment.name;
}

ODataMember.prototype.execute = function (manager, done_callback) {
    this.owner.get_by_name(manager, this.member_name, done_callback);    
};