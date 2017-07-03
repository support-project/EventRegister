const logger = require('logger');

const fileChecker = require('./fileChecker');
const saveEvent = require('./saveEvent');

module.exports = function() {
  logger.sys.info('start main process');
  // 読み込みが完了していない ics ファイルを取得
  fileChecker().each(function(file) {
    logger.app.trace(file);
    return saveEvent(file);
  }).then(function() {
    logger.sys.info('finish main process');
  }).catch(function(err) {
    logger.sys.error('finish main process with error');
    logger.sys.error(JSON.stringify(err));
  });
};
