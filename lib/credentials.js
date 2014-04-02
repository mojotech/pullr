var fs            = require('fs');
var prompt        = require('prompt');
var colors        = require('colors');
var request       = require('request');
var cacheFileName = process.env.HOME + "/.pullr-token-cache";
var package       = require('../package.json');

// Hash map of Github Error messages
var gh_errors = {
  bad_credentials: /bad credential/i,
  validation_fail: /validation fail/i,
  oauthaccess:     /oauthaccess/i,
  already_exist:   /already.+exist/i
};

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
        if (err) {
          return cb(err);
        }

        d = JSON.parse(d);
        if (d.token) {
          return cb(null, credentials);
        }

        // Handle error cases where token wasn't returned
        if (gh_errors.bad_credentials.test(d.message)) {
          return cb("Invalid GitHub Credentials");
        } else if (gh_errors.validation_fail.test(d.message)) {
          // check if this was an OAuth already exists error - if so
          // we assume this means the user has already auth'd the pullr
          // app so accept their credentails as valid and move on
          var error = d.errors[0];
          if (gh_errors.oauthaccess.test(error.resource) && gh_errors.already_exist.test(error.code)) {
            return cb(null, credentials);
          }
        }
        return cb(d.message);

      });
    });
  }
}

module.exports = {
  get: get,
  hasAuthToken: hasAuthToken
};

