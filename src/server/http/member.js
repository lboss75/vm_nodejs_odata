module.exports = {
    create_member: function (segment) {
        return new ODataMember(segment); 
    }
};

function ODataMember(segment) {
    this.member_name = segment.name;
}