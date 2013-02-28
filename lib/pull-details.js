var _     = require('underscore');
var async = require('async');
var sys   = require('sys');
var exec  = require('child_process').exec;
var child;

module.exports = function(cb) {
  async.series([
    getHead,
    getBase,
    getTitle
  ], function(err, data) {
    if (err) {
      cb(err);
    } else {
      cb(null, {
        title: data[2],
        head: data[0],
        base: data[1]
      });
    }
  });
}

function argumentHelper(argument, func, cb) {
  var arg = _.filter(process.argv, function(val){ return ~val.indexOf(argument)});
  if (arg.length) {
    if (cb) {
      cb(null, arg[0].split('=')[1])
    } else {
      return arg[0].split('=')[1];
    }
  } else {
    return func();
  }
}

function getTitle(cb) {
  argumentHelper('--title=', function() {
    exec('git log -n 1 --format="%s"', function(err, stdout, stderr) {
      cb(err, stdout.split("\n")[0]);
    });
  }, cb);
}

function getBase(cb) {
  argumentHelper('--base=', function() {cb(null, "master")}, cb);
}

function getHead(cb) {
  argumentHelper('--head=', function() {
    exec("git rev-parse --abbrev-ref HEAD", function(err, stdout, stderr) {
      cb(err, stdout.split("\n")[0]);
    });
  }, cb);
}