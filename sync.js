var itunesconnect = require('./itunesconnect');
var _ = require('lodash');

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
    addOrUpdate: function(email, firstName, lastName, groupNames, connect) {
        var name = [firstName, lastName].filter(function(s){ return s != '' }).join(' ')
        console.log('Add/update "%s" <%s> with groups %j', name, email, groupNames);
        
        connect = connect || makeConnect();
        
        var updateName = function(tester, completed) {                
            if (tester.firstName.value != firstName || tester.lastName.value != lastName) {                    
                tester.firstName.value = firstName;
                tester.lastName.value = lastName;

                connect.updateTesterName(tester, function(error, body) {
                    if (error) {
                        console.error(error);
                    } else {
                        console.log('Renamed tester with email <%s> in iTunes Connect.', email);
                        
                        completed();
                    }
                });
            } else {
                completed();
            }
        };
        
        var updateGroups = function(tester) {
            var testerGroupNames = _.map(tester.groups, function(g){ return g.name.value });
            
            if (!_.isEmpty(_.xor(testerGroupNames, groupNames))) {
                connect.groups(function(error, body) {                    
                    connect.updateTesterGroups(tester, groupNames, function(error, body) {
                        if (error) {
                            console.error(error);
                        } else {
                            console.log('Updated groups for tester with email <%s> in iTunes Connect.', email);
                        }
                    });
                });
            }
        };
        
        connect.tester(email, function(error, body) {
            if (error) {
                connect.createTester(email, firstName, lastName, groupNames, function(error, body) {
                    if (error) {
                        console.error(error);
                    } else {
                        console.log('Created tester with email <%s> in iTunes Connect.', email);
                    }
                });
            } else {
                console.log('Found tester with email <%s> in iTunes Connect.', email);
                        
                var tester = body.data.tester;
                updateName(tester, function(){ updateGroups(tester); });
            }
        });
    },
    updateEmail: function(oldEmail, newEmail, connect) {
        console.log('Change email from <%s> to <%s>', oldEmail, newEmail);
        
        connect = connect || makeConnect();
        
        connect.tester(oldEmail, function(error, body) {
            if (error) {
                console.error('Cannot find tester with email <%s> in iTunes Connect.', oldEmail);
            } else {
                var tester = body.data.tester;
                
                var firstName = tester.firstName.value;
                var lastName = tester.lastName.value;
                var groupNames = _.map(tester.groups, function(g){ return g.name.value; });
                
                connect.deleteTester(tester, function(error, body) {
                    if (error) {
                        console.error(error);
                    } else {
                        console.log('Deleted tester with email <%s> from iTunes Connect.', oldEmail);
                        
                        connect.createTester(newEmail, firstName, lastName, groupNames, function(error, body) {
                            if (error) {
                                console.error(error);
                            } else {
                                console.log('Created tester with email <%s> in iTunes Connect.', newEmail);
                            }
                        });
                    }
                });
            }
        });
    },
    remove: function(email, connect) {
        console.log('Remove <%s>', email);
        
        connect = connect || makeConnect();
        
        connect.tester(email, function(error, body) {
            if (error) {
                console.error('Cannot find tester with email <%s> in iTunes Connect.', email);
            } else {
                var tester = body.data.tester;
                connect.deleteTester(tester, function(error, body) {
                    if (error) {
                        console.error(error);
                    } else {
                        console.log('Deleted tester with email <%s> from iTunes Connect.', email);
                    }
                });
            }
        });
    }
};
