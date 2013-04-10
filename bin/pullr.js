#!/usr/bin/env node
var colors      = require('colors');
var credentials = require('../lib/credentials');
var pullRequest = require('../lib/pull-request');

credentials(function(err, token) {
  if (err) {
    console.log("Error".inverse.red + " " + JSON.stringify(err).yellow);
  } else {
    pullRequest(token);
  }
});
