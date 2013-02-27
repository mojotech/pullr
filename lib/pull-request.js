var colors      = require('colors');
var request     = require('request');
var pullDetails = require('./pull-details');
var sys         = require('sys');
var exec        = require('child_process').exec;

module.exports = function(token) {
  pullDetails(function(err, data) {
    if (err) {
      console.log("Error".inverse.red);
      console.log(err);
    } else {
      openPR(data, token);
    }
  });
}

function pullUrl(cb) {
  exec('git remote show -n origin | grep Fetch | cut -d: -f2-', function(err, stdout, stderr) {
    if (err) {
      cb(err);
    } else {
      var baseSplit =  stdout.split(':')[1].split('/')
      var url = 'https://api.github.com/repos/'+baseSplit[0]+'/'+baseSplit[1].split('.git')[0]+'/pulls'
      cb(null, url);
    }
  });
}

function openPR(details, token) {
  pullUrl(function(err, url) {
    if (err) {
      console.log("error")
    } else {
      request.post(url, {
        'auth': {
          'username': token.email,
          'password': token.password
        },
        body: JSON.stringify(details)
      }, function(err, res, d) {
          d = JSON.parse(d);
          if (err) {
            console.log("Error".inverse.red);
            console.log(err);
          }

          if (d.errors && d.errors.length) {
            console.log("Error".inverse.red);
            console.log(d.errors);
          } else {
            console.log("Pull Request Opened".green);
          }
      });
    }
  });
}