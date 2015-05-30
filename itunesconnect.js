var async = require('async');
var request = require('request');
var cheerio = require('cheerio');
var _ = require('lodash');

function Connect(username, password, options) {
    this.options = {
        baseURL: "https://itunesconnect.apple.com",
        apiURL: "https://itunesconnect.apple.com/WebObjects/iTunesConnect.woa/ra",
        concurrentRequests: 2,
        errorCallback: function(e) {},
        loginCallback: function() {},
    };
    _.extend(this.options, options);

    // Create a private cookie jar
    this._jar = request.jar();

    // Task Executor
    this._queue = async.queue(
        this.executeRequest.bind(this), 
        this.options.concurrentRequests
    );
    // Pause queue and wait for login to complete
    this._queue.pause();

    // Login to iTunes Connect
    this.login(username, password);
}

Connect.prototype.login = function(username, password) {
    var self = this;
    request.get({
        url: this.options.baseURL,
        jar: this._jar,
    }, function(error, response, body) {
        // Search for action attribute
        var action = cheerio.load(body)('form').attr('action');

        request.post({
            url: self.options.baseURL + action, 
            jar: self._jar,
            form: {
                'theAccountName': username,
                'theAccountPW': password,
            },
        }, function(error, response, body) {
            if (error || response.statusCode != 302) {
                error = error || new Error('There was a problem logging in to iTunes Connect. Please check your username and password.');
                self.options.errorCallback(error);
            } else { 
                self.options.loginCallback();
                
                // Start requests queue
                self._queue.resume();
            }
        });
    });
}

Connect.prototype.request = function(query, completed) {
    // Push request to queue
    this._queue.push({
        query: query, 
        completed: completed,
    });

    return this;
}

Connect.prototype.executeRequest = function(task, callback) {
    var query = task.query;
    var completed = task.completed;
    
    request({
        url: this.options.apiURL + query.endpoint,
        method: query.body ? 'POST' : 'GET',
        jar: this._jar,
        body: query.body,
        json: true,
    }, function(error, response, body) {
        if (response.statusCode == 401) {
            error = new Error('This request requires authentication. Please check your username and password.');
            body = null;
        }
        
        // Call completed callback
        completed(error, body);
        
        // Call callback to mark queue task as done
        callback();
    });
}

Connect.prototype.groups = function(completed) {
    this._queue.push({
        query: {
            endpoint: '/users/pre/groups/edit',
        },
        completed: completed,
    });
}

Connect.prototype.tester = function(email, completed) {    
    this._queue.push({
        query: {
            endpoint: '/users/pre/' + email + '/details',
        },
        completed: function(error, body) {
            if (!error && !body.data.tester.emailAddress.value) {
                error = new Error('Failed to get tester with email <' + email + '> in iTunes Connect.');
                body = null;
            }
            
            completed(error, body);
        },
    });
}

Connect.prototype.updateTesterName = function(tester, completed) {
    this._queue.push({
        query: {
            body: {
                tester: tester,
            },
            endpoint: '/users/pre/' + tester.emailAddress.value + '/details',
        },
        completed: function(error, body) {
            if (!error && body.statusCode != 'SUCCESS') {
                error = new Error('Failed to update name for tester with email <' + tester.emailAddress.value + '> in iTunes Connect.');
                body = null;
            }
            
            completed(error, body);
        },
    });
}

Connect.prototype.updateTesterGroups = function(tester, groupNames, completed) {
    var self = this;
    
    this._queue.push({
        query: {
            body: [tester],
            endpoint: '/users/pre/groups/membership',
        },
        completed: function(error, body) {
            if (error) {
                completed(error, body);
            } else {
                var body = body.data;
                _.forEach(body.groups, function(g){
                    g.areMembers = _.includes(groupNames, g.group.name.value);
                });
        
                // Create the tester
                self._queue.push({
                    query: {
                        body: body,
                        endpoint: '/users/pre/groups/membership/save',
                    },
                    completed: function(error, body) {
                        if (!error && body.statusCode != 'SUCCESS') {
                            error = new Error('Failed to update groups for tester with email <' + tester.emailAddress.value + '> in iTunes Connect.');
                            body = null;
                        }
                    
                        completed(error, body);
                    },
                });
            }
        },
    });
}

Connect.prototype.createTester = function(email, firstName, lastName, groupNames, completed) {
    var self = this;
    
    // Get the list of available groups (for assigning to the tester)
    this.groups(function(error, body) {
        if (error) {
            completed(error, body);
        } else {
            var availableGroups = body.data.groups;
            
            var groupsToAdd = _.filter(availableGroups, function(g){ return _.includes(groupNames, g.name.value) });
            
            var tester = {
                emailAddress: {
                    value: email,
                    errorKeys: [],
                },
                firstName: {
                    value: firstName
                },
                lastName: {
                    value: lastName
                },
                testing: {
                  value: true
                },
                groups: groupsToAdd,
            };
        
            // Create the tester
            self._queue.push({
                query: {
                    body: {
                        testers: [tester]
                    },
                    endpoint: '/users/pre/create',
                },
                completed: function(error, body) {
                    if (!error && body.statusCode != 'SUCCESS') {
                        error = new Error('Failed to create tester with email <' + email + '> in iTunes Connect.');
                        body = null;
                    }
                    
                    completed(error, body);
                },
            });
        }
    });
}

Connect.prototype.deleteTester = function(tester, completed) {
    this._queue.push({
        query: {
            body: [tester],
            endpoint: '/users/pre/ext/delete',
        },
        completed: function(error, body) {
            if (!error && body.statusCode != 'SUCCESS') {
                error = new Error('Failed to delete tester with email <' + tester.emailAddress.value + '> in iTunes Connect.');
                body = null;
            }
            
            completed(error, body);
        },
    });
}

Connect.prototype.createGroup = function(groupName, testers, completed) {
    var self = this;
    this._queue.push({
        query: {
            endpoint: '/users/pre/groups/create',
        },
        completed: function(error, body) {
            if (error) {
                completed(error, body);
            } else {
                body = body.data;
                body.group.name.value = groupName;
                body.testers = testers;
            
                self._queue.push({
                    query: {
                        body: body,
                        endpoint: '/users/pre/groups/create',
                    },
                    completed: function(error, body) {
                        if (!error && body.statusCode != 'SUCCESS') {
                            error = new Error('Failed to create "' + groupName + '" group in iTunes Connect.');
                            body = null;
                        }
                        
                        completed(error, body);
                    },
                });
            }
        },
    });
}

module.exports = {
    'Connect': Connect
};
