const ical = require('ical');
const logger = require('logger');
const config = require('config');
const Promise = require('bluebird');
const moment = require('moment-timezone');

let re;
if (config.app.ignore_title_regexp) {
  re = new RegExp(config.app.ignore_title_regexp); 
}

const debugOut = function(label, event) {
  logger.app.debug(label + event.title + ' : ' + event.uid + '\n\t' 
    + moment(event.start).format() + ' - ' + moment(event.end).format() + ' : ' + event.location);
};

const isIgnore = function(event) {
  if (config.app.ignore_title_regexp) {
    if (re.test(event.title)) {
      debugOut('対象外(タイトル):', event);
      return true;
    }
  }
  let now = moment();
  let start = moment(event.start);
  if (now.valueOf() >= start.valueOf()) {
    // TODO 過去の情報は登録しないようにする？ いったん過去の情報も入っていれば登録する
    debugOut('対象外(過去):', event);
//    return true;
  } else if (now.valueOf() + (1000 * 60 * 60 * 24 * config.app.period_days) < start.valueOf()) {
    // 遠い未来の情報も登録ししない
    debugOut('対象外(遠い未来):', event);
    return true;
  }
  return false;
};


module.exports = function (filename) {
  logger.app.trace(filename);
  return Promise.try(function () {
    let data = ical.parseFile(filename);
    logger.app.trace(data);
    let keys = Object.keys(data);
    let items = [];
    keys.forEach(function(key) {
      let item = data[key];
      if (item.type === 'VEVENT') {
        var obj = {
          type: 'EVENT',
          filename: filename,
          uid: item.uid,
          title: item.summary.val ? item.summary.val : item.summary,
          class: item.class,
          start: item.start,
          end: item.end,
          location: item.location,
          created: item.created,
          updated: item['last-modified'],
          description: item.description
        };
        if (!isIgnore(obj)) {
          items.push(obj);
        }
      }
    });
    return Promise.resolve(items);
  });
};
