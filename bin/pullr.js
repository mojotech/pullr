#!/usr/bin/env node
var colors      = require('colors');
var credentials = require('../lib/credentials');

credentials(function(err, token) {
  if (err) {
    console.log("Error".inverse.red + " " + JSON.stringify(err).yellow);
  } else {
    console.log("Logged in!".green);
  }
});