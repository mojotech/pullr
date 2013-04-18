var mocha   = require('mocha');
var fs      = require('fs');
var assert  = require('assert');
var exec    = require('child_process').exec;

describe("Credentials", function() {
  var credentials   = require('../lib/credentials');
  var cacheFileName = process.env.HOME + "/.pullr-token-cache";
  // clear credentails
  before(function(done) {
    fs.exists(cacheFileName, function(isThere) {
      if (isThere) {
        exec("rm "+cacheFileName, function(err, stdout, stderr) {
          if (err || stderr) {
            throw(err || stderr);
          }
        });
      } else {
        done()
      }
    });
  });

  // remove dummy credentails
  after(function() {
    exec("rm "+cacheFileName);
  });

  it("should not be there", function(done) {
    credentials.hasAuthToken(null, function(err, d) {
      assert.equal("ENOENT", err.code);
      done();
    });
  });

  it("should be found", function(done) {
    fs.writeFile(cacheFileName, JSON.stringify({foo: 123}), function(err, d) {
      credentials.hasAuthToken(null, function(err, d) {
        assert.deepEqual({foo: 123}, d);
        done(err);
      });
    });
  });
});
