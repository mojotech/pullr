var fs      = require('fs');
var prompt  = require('prompt');
var colors  = require('colors');
var request = require('request');

module.exports = function(cb) {
  hasAuthToken(function(authToken) {
    if (authToken) {
      cb(null, authToken);
    } else {
      getAuthToken(function(err, token) {
        if (err) {
          cb(err);
        } else {
          fs.writeFile(__dirname+'/../.pullr-cache', JSON.stringify(token), function(err, d) {
            if (err) {
              cb(err);
            } else  {
              cb(null, token);
            }
          })
        }
      });
    }
  });
}

function getAuthToken(cb) {
  prompt.start();
  promptSchema = {
    properties : {
      email: {
        required: true
      },
      password: {
        hidden: true,
        required: true
      }
    }
  }

  prompt.message = " ";
  prompt.delimiter = "";

  console.log("Please Enter Your GitHub Credentails".yellow.inverse);
  prompt.get(promptSchema, function(err, credentials) {
    request.post('https://api.github.com/authorizations', {
      'auth': {
        'username': credentials.email,
        'password': credentials.password
      },
      'body': JSON.stringify({note: 'pullr', scopes: ['repo']})
    }, function(err, res, d) {
      d = JSON.parse(d);
      if (err) {
        cb(err);
      }
      if (d.token) {
        cb(null, credentials);
      } else {
        cb("Invalid GitHub Credentials");
      }
    });
  });
}

function hasAuthToken(cb) {
  fs.readFile(__dirname+"/../.pullr-cache", 'utf8', function(err, d) {
    if (err || ~process.argv.indexOf("--forcelogin")) {
      cb(false);
    } else {
      cb(JSON.parse(d));
    }
  });
}