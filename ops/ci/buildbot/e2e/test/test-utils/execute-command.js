//@flow
'use strict';
const Promise = require('bluebird');
const child_process = require('child_process');
const exec = Promise.promisify(child_process.exec, {multiArgs: true});

exports.executeAndEnsureCommandSucceeded = function(command/*:string*/, options/*:child_process$execOpts*/ = {}) {
  return new Promise((resolve, reject) => 
    child_process.exec(command, options, (error, stdout, stderr) => {
      if (error) {
        console.error(`command ${command} failed with:\n${stdout.toString()}\n${stderr.toString()}\n`);

        return reject(new Error(`command ${command} failed`));
      }

      resolve();
    })
  );
};
