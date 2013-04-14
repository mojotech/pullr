var fs            = require('fs');
var prompt        = require('prompt');
var colors        = require('colors');
var request       = require('request');
var cacheFileName = process.env.HOME + "/.pullr-token-cache";

module.exports = function(forceLogin, cb) {
  hasAuthToken(function(authToken) {
    if (authToken) {
      cb(null, authToken);
    } else {
      getAuthToken(function(err, token) {
        if (err) {
          cb(err);
        } else {
          fs.writeFile(cacheFileName, JSON.stringify(token), function(err, d) {
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

  function getAuthToken(cb) {
    prompt.start();
    promptSchema = {
      properties : {
        email    : {
          required    : true,
          description : ' Email:'
        },
        password : {
          hidden      : true,
          required    : true,
          description : ' Password:'
        }
      }
    }

    prompt.message   = "";
    prompt.delimiter = "";

    console.log(" Please Enter Your GitHub Credentails ".yellow.inverse);
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
    fs.readFile(cacheFileName, 'utf8', function(err, d) {
      if (err || forceLogin) {
        cb(false);
      } else {
        cb(JSON.parse(d));
      }
    });
  }
}