const config = require('config');
const log4js = require('log4js');
var PositionLogger = require('./PositionLogger');

log4js.configure(config.log4js.configure);

let loggers = {};

config.log4js.configure.appenders.forEach(function(appender) {
  let logger = log4js.getLogger(appender.category)
  logger.setLevel(appender.level);
  loggers[appender.category] = new PositionLogger(logger);
}, this);

module.exports = loggers;
