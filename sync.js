module.exports = {
	addOrUpdate: function(email, firstName, lastName, groups) {
		var name = [firstName, lastName].filter(function(s){ return s != '' }).join(' ')
		console.log('Add/update "%s" <%s> with groups %j', name, email, groups);
	},
	updateEmail: function(oldEmail, newEmail) {
		console.log('Change email from <%s> to <%s>', oldEmail, newEmail);
	},
	remove: function(email) {
		console.log('Remove <%s>', email);
	}
};
