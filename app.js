const logger = require('logger');
const config = require('config');
const CronJob = require('cron').CronJob;

const main = require('./lib/main');

process.on('uncaughtException', function(err) {
    logger.error('uncaughtException');
    logger.error(err.stack);
});
process.on('unhandledRejection', function(err) {
    logger.error('unhandledRejection');
    logger.error(err.stack);
});

logger.sys.info('app start...');

let job = new CronJob(config.app.cron, function() {
  main();  
});
job.start();
