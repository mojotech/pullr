var _     = require('underscore');
var sys   = require('sys');
var exec  = require('child_process').exec;
var child;

module.exports = function(cb) {
  getHead(function(err, head) {
    if (err) {
      cb(err);
    } else {
      getBase(function(err, base) {
        if (err) {
          cb(err);
        } else {
          getTitle(function(err, title) {
            if (err) {
              cb(err);
            } else {
              cb(null, {
                title: title,
                head: head,
                base: base
              });
            }
          });
        }
      });
    }
  })
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