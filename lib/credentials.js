var fs            = require('fs');
var prompt        = require('prompt');
var colors        = require('colors');
var request       = require('request');
var cacheFileName = process.env.HOME + "/.pullr-token-cache";
var package       = require('../package.json');


function hasAuthToken(forceLogin, cb) {
  fs.readFile(cacheFileName, 'utf8', function(err, d) {
    if (err) {
      cb(err);
    } else if (forceLogin || d === undefined) {
      cb(null, false);
    } else {
      cb(null, JSON.parse(d));
    }
  });
}

function get(forceLogin, cb) {
  hasAuthToken(forceLogin, function(err, authToken) {
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
        headers : {
          'User-Agent': 'Pullr NPM v'+package.version
        },
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
}

module.exports = {
  get: get,
  hasAuthToken: hasAuthToken
};

