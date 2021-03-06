"use strict";
var expect = require('chai').expect;
var _ = require('lodash');
var versionCalc = require('../lib/version-calculations');
var support = require('./support');
var shelljs = require('shelljs');
var commander = require('../lib/npm-commander');

var index = require('..');

describe('package', function () {
  this.timeout(60000);

  describe("#getRegistryPackageInfo", function () {

    it("should find package info of an existing package", function (done) {
      index.getRegistryPackageInfo('rapido', function (err, packageInfo) {
        expect(err).to.be.undefined;
        expect(packageInfo.name).to.equal('rapido', packageInfo.repository.url);
        done(err);
      });
    });

    it("should return undefined for a non-existing package", function (done) {
      index.getRegistryPackageInfo('i-really-hope-this-package-doesnt-exist', function (err, packageInfo) {
        expect(err).to.be.undefined;
        expect(packageInfo).to.be.undefined;
        done(err);
      });
    });
  });

  describe("#findPublishedVersions", function () {

    it("should find published versions of an existing package", function (done) {
      index.findPublishedVersions('rapido', function (err, publishedVersions) {
        expect(err).to.be.undefined;
        expect(_.take(publishedVersions, 7)).to.include.members(['0.0.0', '0.1.0', '0.1.1', '0.1.2']);
        done(err);
      });
    });

    it("should return undefined for a non-existing package", function (done) {
      index.findPublishedVersions('i-really-hope-this-package-doesnt-exist', function (err, publishedVersions) {
        expect(err).to.be.undefined;
        expect(publishedVersions).to.be.undefined;
        done(err);
      });
    });
  });

  describe("#normalizeVersions", function () {

    it("should support version that is not an array (happens when there is only one version)", function () {
      expect(index.normalizeVersions("1.4")).to.deep.equal(["1.4"]);
    });

    it("should support no version", function () {
      expect(index.normalizeVersions(undefined)).to.deep.equal([]);
    });

    it("should support empty array", function () {
      expect(index.normalizeVersions([])).to.deep.equal([]);
    });

    it("should support empty string", function () {
      expect(index.normalizeVersions("")).to.deep.equal([]);
    });
  });

  describe("#incrementPatchVersionOfPackage", function () {
    var tempDir, packageJson;

    before(function () {
      tempDir = support.clone();
      packageJson = support.readPackageJson();
    });

    after(function () {
      support.rmFolder(tempDir);
    });

    it("should increment patch version of current package", function (done) {
      var currentPackageVersion = packageJson.version;

      index.findPublishedVersions(packageJson.name, function (err, publishedVersions) {
        if (err) {
          done(err);
          return;
        }

        var expectedNextVersion = versionCalc.calculateNextVersionPackage(currentPackageVersion,
          publishedVersions || []);

        index.incrementPatchVersionOfPackage(function (err, nextVersion) {
          expect(err).to.be.undefined;
          expect(nextVersion).to.equal(expectedNextVersion);
          expect(support.readPackageJson().version).to.equal(expectedNextVersion);
          if (err) {
            done(err);
            return;
          }
          // Ensure that if the increment is not needed, then it still won't fail
          index.incrementPatchVersionOfPackage(function (err, nextVersion) {
            expect(err).to.be.undefined;
            expect(nextVersion).to.equal(expectedNextVersion);
            expect(support.readPackageJson().version).to.equal(expectedNextVersion);
            done(err);
          });
        });
      });
    });
  });
});
