# beta-sync

Webhook for MailChimp that syncs list subscription changes with external TestFlight users in iTunes Connect.

## Running Locally

Make sure you have [Node.js](http://nodejs.org/) and the [Heroku Toolbelt](https://toolbelt.heroku.com/) installed.

```sh
$ git clone git@github.com:CrossWaterBridge/beta-sync.git # or clone your own fork
$ cd beta-sync
$ npm install
$ npm start
```

Your app should now be running on [localhost:5000](http://localhost:5000/).

## Deploying to Heroku

```
$ heroku create
$ git push heroku master
$ heroku open
```
