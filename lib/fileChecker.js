const logger = require('logger');
const config = require('config');
const fs = require('fs');
const Promise = require('bluebird');

const ds = require('datastore');

const getFileListOnTargetDir = function () {
  return new Promise(function (resolve, reject) {
    fs.readdir(config.app.ical_directory, function (err, files) {
      if (err) return reject(err);

      let fileList = [];
      files.filter(function (file) {
        return fs.statSync(config.app.ical_directory + file).isFile() && /.*\.ics$/.test(file);
      }).forEach(function (file) {
        fileList.push(file);
      });
      logger.app.trace(fileList);
      return resolve(fileList);
    });
  });
};

const getReadTargetFiles = function (files) {
  logger.app.trace(files);
  return Promise.try(function () {
    let fileList = [];
    return Promise.each(files, function (file) {
      logger.app.trace(file);
      return Promise.try(function () {
        return ds.findOne({
          type: 'FILE',
          filename: file
        }).then(function (doc) {
          if (!doc) {
            logger.app.debug('処理対象に登録(新規): ' + file);
            fileList.push(file);
          } else {
            var stat = fs.statSync(config.app.ical_directory + file);
            if (doc.updated < stat.mtime) {
              logger.app.debug('処理対象に登録(更新): ' + file);
              fileList.push(file);
            } else {
              logger.app.debug('処理済: ' + file);
            }
          }
          return Promise.resolve(file);
        });
      });
    }).then(function () {
      logger.app.trace(fileList);
      return Promise.resolve(fileList);
    });
  });
};

module.exports = function () {
  logger.app.trace('start target ical file check');
  return getFileListOnTargetDir().then(function (files) {
    logger.app.trace(files);
    return getReadTargetFiles(files);
  });
};
