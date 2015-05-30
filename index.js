var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 5000));

var webhook = function(request, response) {
  if (request.query.key == process.env.API_KEY) {
    response.send('OK\n');
  } else {
    response.status(403).end();
  }
};
app.get('/webhook', webhook);
app.post('/webhook', webhook);

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
