var itunesconnect = require('./itunesconnect');
var mcapi = require('mailchimp-api');
var _ = require('lodash');
var sync = require('./sync');

function makeConnect() {
    return new itunesconnect.Connect(process.env.ITC_USERNAME, process.env.ITC_PASSWORD, {
        errorCallback: function(e) {
            console.error(e);
        },
        loginCallback: function() {
            console.log('Successfully logged in to iTunes Connect.');
        }
    });
}

module.exports = {
	sync: function(apiKey, listId) {
		var mailchimp = new mcapi.Mailchimp(apiKey);
		
		var members = []
		
		function getMembers(page, completed) {
			console.log('Getting page %d of subscribers for list %s from MailChimp.', page + 1, listId);
		
			mailchimp.lists.members({
				id: listId,
				opts: {
					start: page,
					limit: 100,
				}
			}, function(body) {
				members = members.concat(body.data);
				if (members.length < body.total) {
					getMembers(page + 1, completed);
				} else {
					completed();
				}
			});
		}
		
		getMembers(0, function() {		
			var connect = makeConnect();
			
			_.forEach(members, function(member) {
				var email = member.email;
				var firstName = member.merges.FNAME;
				var lastName = member.merges.LNAME;
				var groupNames = _.reduce(member.merges.GROUPINGS, function(result, g) {
					return result.concat(_.map(_.filter(g.groups, function(g){ return g.interested; }), function(g){ return g.name; }));
				}, []);
				
				sync.addOrUpdate(email, firstName, lastName, groupNames, connect);
			});
		});
	},
};
