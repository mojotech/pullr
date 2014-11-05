#!/usr/bin/env node

var Q           = require('q'),
    exec        = require('child_process').exec,
    colors      = require('colors'),
    request     = require('request'),
    program     = require('commander'),
    package     = require('../package.json'),
    credentials = require('../lib/credentials'),
    UNotifier   = require('update-notifier');

var notifier = UNotifier({
  packagePath: "../package.json"
});

if (notifier.update) {
  notifier.notify();
}

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
  .option('--plaintext', 'print success / error messages without ansi codes')
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
  if(!shouldOpenNewPullRequest() && !program.forceLogin) {
    program.outputHelp(); throw 'Missing required options.';
  }
  else if (program.forceLogin && !shouldOpenNewPullRequest()) {
    return { loginOnly: true }
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
    preflight   : program.preflight,
    plaintext   : program.plaintext
  }
})
.then(openPullRequest)
.fail(function(error) {
  var msg = ' Error: ' + error + ' ';
  if (program.plaintext) {
    console.log(msg);
  } else {
    console.log(msg.inverse.red);
  };
  process.exit(1);
})
.done(function(msg) {
  console.log(msg);
  process.exit(0);
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
          repo : _url[1].replace(/\.git$/, "")
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
  if (options.loginOnly) {
    var msg = ' Login successful '
    if (options.plaintext) {
      return msg
    } else{
      return msg.green.inverse
    };
  }
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
    var msg = ('Success: Preflighted a pull request from '
               + head + ' into ' + base + ' for ' + repo + '.')
    if (options.plaintext) {
      return msg
    } else {
      return msg.inverse.green;
    };

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
            && (body.errors.slice(-1)[0].field || body.errors.slice(-1)[0].message)
            || body.message);

      if (state !== 'open') {
        throw error === 'base' ? "Remote branch doesn't exist. Did you push?" : error
      }

      var msg = (' Success: Opened a pull request from '
                 + head + ' into ' + base + ' for ' + repo + '.');

      return (options.plaintext ?
              msg :
              msg.inverse.green
            ) + "\n " + body.html_url;
    });
  }
}
