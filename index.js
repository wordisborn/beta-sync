var express = require('express');
var bodyParser = require('body-parser');
var sync = require('./sync');
var batch = require('./batch');

var app = express();

app.set('port', (process.env.PORT || 5000));

app.get('/webhook', function(request, response) {
    if (request.query.key == process.env.API_KEY) {
        response.send('OK\n');
    } else {
        response.status(403).end();
    }
});
app.post('/webhook', bodyParser.urlencoded({ extended: true }), function(request, response) {
    if (request.query.key == process.env.API_KEY) {
        switch (request.body.type) {
        case 'profile':
            var email = request.body.email;
            if (email == undefined) {
                console.error('Missing email in request body: %j', request.body);
            } else {
                var firstName = request.body.data.merges.FNAME || null;
                var lastName = request.body.data.merges.LNAME || null;
                var groupNames = (request.body.data.merges.INTERESTS || '').split(',').map(function(s){ return s.trim() }).filter(function(s){ return s != '' });
    
                sync.addOrUpdate(email, firstName, lastName, groupNames);
            }
            break;
        case 'upemail':
            var oldEmail = request.body.data.old_email;
            var newEmail = request.body.data.new_email;
            if (oldEmail == undefined) {
                console.error('Missing old email in request body: %j', request.body);
            } else if (newEmail == undefined) {
                console.error('Missing new email in request body: %j', request.body);
            } else {
                sync.updateEmail(oldEmail, newEmail);
            }
            break;
        case 'unsubscribe':
            var email = request.body.data.merges.EMAIL;
            if (email == undefined) {
                console.error('Missing email in request body: %j', request.body);
            } else {
                sync.remove(email);
            }
            break;
        case 'cleaned':
            var email = request.body.data.email;
            if (email == undefined) {
                console.error('Missing email in request body: %j', request.body);
            } else {
                sync.remove(email);
            }
            break;
        default:
            console.error('Missing or unexpected type in request body: %j', request.body);
        }
        
        response.send({ "success": "User added!" });
    } else {
        response.status(403).end();
    }
});
app.post('/batch', function(request, response) {
    if (request.query.key == process.env.API_KEY) {
        batch.sync(process.env.MC_API_KEY, process.env.MC_LIST_ID);
                
        response.send('OK\n');
    } else {
        response.status(403).end();
    }
});

app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
});
