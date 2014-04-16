var _             = require('lodash');
var Q             = require('q');
var fs            = require('fs');
var path          = require('path');
var read          = Q.denodeify(fs.readFile);
var cacheFileName = path.join(process.env.HOME, ".pullr-token-cache");

module.exports = get

function get(force, cb) {
  read(cacheFileName, "utf8")
  .then(_.partial(resolveAuth, force))
  .catch(cb)
  .then(function(credentials) {
    cb(null, credentials);
  });
}

function resolveAuth(force, cache) {
  if (cache.bitbucket && !force) {
    return cache.bitbucket
  }

  return requestAuth().then(saveAuth)
}


function requestAuth() {
  console.log("!!!!!");
}

function saveAuth() {

}


get()
