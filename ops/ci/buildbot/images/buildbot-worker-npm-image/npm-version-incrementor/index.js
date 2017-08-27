"use strict";
var versionCalc = require('./lib/version-calculations');
var commander = require('./lib/npm-commander');

exports.getRegistryPackageInfo = function getRegistryPackageInfo(packageName, cb) {
  commander.readPackage(function (err, packageJson) {
    if (err)
      cb(err);

    var registry = packageJson.publishConfig && packageJson.publishConfig.registry;
    var registryOption = registry ? "--registry " + registry : "";

    commander.execSilent("npm view " + registryOption + " --json " + packageName, function (err, output) {
      if (err) {
        if (err.message.indexOf("npm ERR! code E404") >= 0) {
          cb(undefined, undefined);
        } else {
          console.error(err.message);
          cb(err);
        }
      } else {
        cb(undefined, JSON.parse(output));
      }
    });
  });
};

exports.findPublishedVersions = function findPublishedVersions(packageName, cb) {
  exports.getRegistryPackageInfo(packageName, function (err, registryPackageinfo) {
    if (err)
      cb(err);
    else if (registryPackageinfo === undefined)
      cb(undefined, undefined);
    else
      cb(undefined, exports.normalizeVersions(registryPackageinfo.versions));
  });
};

exports.normalizeVersions = function normalizeVersions(versions) {
  if (!versions)
    return [];

  if (typeof versions === 'string')
    return [versions];
  else
    return versions;
};

exports.incrementPatchVersionOfPackage = function incrementPatchVersionOfPackage(cb) {
  // We can't just require('package.json') because this code may be called from other packages
  // as part of the build process (see README.md)
  commander.readPackage(function (err, packageJson) {
    var packageName = packageJson.name;

    exports.findPublishedVersions(packageName, function (err, registryVersions) {
      if (err) {
        cb(err);
        return;
      }

      var localPackageVersion = packageJson.version;

      var nextVersion = versionCalc.calculateNextVersionPackage(localPackageVersion, registryVersions || []);

      if (nextVersion === localPackageVersion) {
        process.nextTick(function () {
          cb(undefined, nextVersion);
        });
        return;
      }

      commander.exec("npm version --no-git-tag-version " + nextVersion, function (err) {
        err ? cb(err, undefined) : cb(undefined, nextVersion);
      });

    });
  });
};
