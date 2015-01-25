var fs = require('fs');
var crypto = require('crypto');
var barrier = require('../helpers').barrier;

var scripts = {};
var shas = {};
var cachedServers = {};

fs.readdirSync('./lib/lua')
  .filter(function (file) {
    return file.slice(-4) === '.lua';
  }).forEach(function (file) {
    var hash = crypto.createHash('sha1');
    var key = file.slice(0, -4);
    scripts[key] = fs.readFileSync('./lib/lua/' + file).toString();
    hash.update(scripts[key]);
    shas[key] = hash.digest('hex');
  });

var buildCache = function (serverKey, client, cb) {
  if (cachedServers[serverKey]) {
    return cb();
  }

  var reportLoaded = barrier(Object.keys(shas).length, function () {
    cachedServers[serverKey] = true;
    return cb();
  });

  Object.keys(shas).forEach(function (key) {
    client.script('exists', shas[key], function (err, exists) {
      if (err) {
        throw Error('Could not build Lua script cache');
      } else if (exists[0] === 0) {
        client.script('load', scripts[key], reportLoaded);
      } else {
        reportLoaded();
      }
    });
  });
};

module.exports = {
  scripts: scripts,
  shas: shas,
  buildCache: buildCache
};