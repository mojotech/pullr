#!/usr/bin/env node

var Q           = require('q'),
    exec        = require('child_process').exec,
    colors      = require('colors'),
    request     = require('request'),
    program     = require('commander'),
    package     = require('../package.json'),
    credentials = require('../lib/credentials');

program
  .version(package.version)
  .option('-n, --new', 'open a new pull request')
  .option('-t, --title <title>', 'pull request title')
  .option('-d, --description <description>', 'pull request description')
  .option('-i, --into <branch>', "target branch, defaults to 'master'")
  .option('-f, --from <branch>', 'source branch, defaults to current')
  .option('-I, --into-remote <remote>', "target remote server, defaults to 'origin'")
  .option('-F, --from-remote <remote>', "source remote server, defaults to 'origin'")
  .option('-l, --force-login', 'request credentials even if already logged in')
  .option('-p, --preflight', 'preflight pull request without actually submitting')
  .parse(process.argv);

Q.all([
  getCredentials(program.forceLogin),
  getRemoteServers(),
  program.title       || getBranchDescription(program.from),
  program.from        || getBranchName(),
  program.into        || 'master',
  program.fromRemote  || 'origin',
  program.intoRemote  || 'origin'
])
.spread(function(
  credentials, servers, title, from, into, fromRemote, intoRemote) {
  if(!shouldOpenNewPullRequest()) {
    program.outputHelp(); throw 'Missing required options.';
  }
  if(!servers[fromRemote]) { throw 'Unknown remote ' + fromRemote + '.'; }
  if(!servers[intoRemote]) { throw 'Unknown remote ' + intoRemote + '.'; }

  return {
    title       : title,
    description : program.description,
    fromBranch  : from,
    fromRepo    : servers[fromRemote].repo,
    fromOwner   : servers[fromRemote].owner,
    intoBranch  : into,
    intoRepo    : servers[intoRemote].repo,
    intoOwner   : servers[intoRemote].owner,
    credentials : credentials,
    preflight   : program.preflight
  }
})
.then(openPullRequest)
.fail(function(error) {
  console.log((' Error: ' + error + ' ').inverse.red);
});

function getBranchDescription(branch) {
  return Q.nfcall(exec, 'git log ' + (branch || '') + ' -n 1 --format="%s"')
    .spread(function(description) { return description.trim(); });
}

function getBranchName() {
  return Q.nfcall(exec, 'git rev-parse --abbrev-ref HEAD')
    .spread(function(name) { return name.trim(); });
}

function getRemoteServers() {
  return Q.nfcall(exec, 'git remote -v')
    .spread(function(servers) {
      var _servers = {};

      servers.split('\n').slice(0, -1).forEach(function(server) {
        var _server = server && server.split(/\s|\t/),
            name    = _server[0],
            type    = _server[2].slice(1, -1),
            _url    = _server[1].split(/\:|\//).slice(-2);

        type === 'fetch' && (_servers[name] = {
          owner: _url[0],
          repo : _url[1].slice(0, -4)
        });

      });

      return _servers;
    });
}

function shouldOpenNewPullRequest() {
  return (program.new || program.into || program.from);
}

function getCredentials(forceLogin) {
  return Q.nfcall(credentials.get, forceLogin);
}

function openPullRequest(options) {
  var url = 'https://api.github.com/repos/'
        + options.intoOwner + '/' + options.intoRepo + '/pulls',
      repo = options.intoRepo,
      head = options.fromOwner + ':' + options.fromBranch,
      base = options.intoBranch;

  if(options.fromRepo !== options.intoRepo) {
    throw 'From repo (' + options.fromRepo + ')'
      + ' does not match into repo (' + options.intoRepo + ').';
  }

  if(options.preflight) {
    console.log(
      (' Success: Preflighted a pull request from '
        + head + ' into ' + base + ' for ' + repo + '. ').inverse.green);
  } else {
    return Q.ninvoke(request, 'post', url, {
      headers : {
        'User-Agent': 'Pullr NPM v'+package.version
      },
      auth : {
        'username' : options.credentials.email,
        'password' : options.credentials.password
      },
      body : JSON.stringify({
        head  : head,
        base  : base,
        body  : options.description,
        title : options.title
      })
    })
    .spread(function(response) {
      var body  = response.body && JSON.parse(response.body),
          state = body.state,
          error = (body.errors
            && body.errors.length
            && body.errors.slice(-1)[0]
            && body.errors.slice(-1)[0].message
            || body.message);

      state !== 'open'
        ? console.log(
          (' Error: ' + error + ' ').inverse.red)
        : console.log(
          (' Success: Opened a pull request from '
            + head + ' into ' + base + ' for ' + repo + '. ').inverse.green);
    });
  }
}
