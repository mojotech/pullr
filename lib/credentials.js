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
          fs.writeFile(__dirname+'/../.pullr-cache', token, function(err, d) {
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
  prompt.get(promptSchema, function(err, d) {
    cb(undefined, d);
    // stubbed out until i determine if I can even use the token
    false && request.post('https://api.github.com/authorizations', {
      'auth': {
        'username': d.email,
        'password': d.password
      },
      'body': JSON.stringify({note: 'pullr', scopes: ['repo']})
    }, function(err, res, d) {
      cb(err, JSON.parse(d).token);
    });
  });
}

function hasAuthToken(cb) {
  // stubed out until I figure out the best way to cache this info
  cb(false);

  false && fs.readFile(__dirname+"/../.pullr-cache", 'utf8', function(err, d) {
    if (err) {
      cb(false);
    } else {
      cb(d);
    }
  });
}