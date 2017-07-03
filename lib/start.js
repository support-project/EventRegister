const main = require('./main');
const logger = require('logger');

process.on('uncaughtException', function (err) {
  logger.sys.error('uncaughtException');
  logger.sys.error(err.stack);
  process.abort();
});
process.on('unhandledRejection', function (err) {
  logger.sys.error('unhandledRejection');
  logger.sys.error(err.stack);
  process.abort();
});

main();
