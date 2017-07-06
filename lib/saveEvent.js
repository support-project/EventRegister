const logger = require('logger');
const config = require('config');
const fs = require('fs');
const moment = require('moment-timezone');
const request = require('request');
const Promise = require('bluebird');

const ds = require('datastore');
const parseIcs = require('./parseIcs');

const getDebugMsg = function (label, event) {
  return label + event.title + ' : ' + event.uid + ' : '
    + moment(event.start).format() + ' - ' + moment(event.end).format() + ' : ' + event.location;
};

const createJson = function (event) {
  let date = moment(event.start).format('YYYY-MM-DD');
  let start = moment(event.start).format('HH:mm');
  let end = moment(event.end).format('HH:mm');

  var json = {
    'content': config.app.description_plefix + event.description,
    'template': 'event',
    'templateItems': [
      {
        'label': config.app.knowledge_event_label.date,
        'value': date
      },
      {
        'label': config.app.knowledge_event_label.start,
        'value': start
      },
      {
        'label': config.app.knowledge_event_label.end,
        'value': end
      },
      {
        'label': config.app.knowledge_event_label.timezone,
        'value': 'Asia/Tokyo'
      },
      {
        'label': config.app.knowledge_event_label.numberCount,
        'value': '50'
      },
      {
        'label': config.app.knowledge_event_label.location,
        'value': event.location ? event.location : ''
      }
    ],
    'title': event.title
  };
  var keys = Object.keys(config.app.body_template);
  keys.forEach(function(key) {
    json[key] = config.app.body_template[key];
  });
  return json;
};


const postEvent = function (event) {
  return new Promise(function (resolve, reject) {
    var options = {
      uri: config.app.knowledge_url + '/api/knowledges',
      headers: {
        'Content-type': 'application/json',
        'PRIVATE-TOKEN': config.app.knowledge_token
      },
      proxy: config.app.proxy,
      json: createJson(event)
    };
    logger.app.debug(JSON.stringify(options));
    request.post(options, function (error, response, body) {
      if (error) return reject(error);
      logger.app.debug(response.statusCode);
      logger.app.debug(body);
      if (response.statusCode !== 201) {
        return reject({
          status: response.statusCode,
          body: body
        });
      }
      event.knowledgeId = body.id;
      return ds.insert(event).then(function () {
        return resolve();
      }).catch(function (err) {
        return reject(err);
      });
    });
  });
};

const putEvent = function (event, doc) {
  return new Promise(function (resolve, reject) {
    if (!doc.knowledgeId) {
      return reject('登録済のデータに、KnowledgeのIDが登録されていません');
    }
    var options = {
      uri: config.app.knowledge_url + '/api/knowledges/' + doc.knowledgeId,
      headers: {
        'Content-type': 'application/json',
        'PRIVATE-TOKEN': config.app.knowledge_token
      },
      proxy: config.app.proxy,
      json: createJson(event)
    };
    logger.app.debug(JSON.stringify(options));
    request.put(options, function (error, response, body) {
      if (error) return reject(error);
      logger.app.debug(response.statusCode);
      logger.app.debug(body);
      if (response.statusCode !== 200) {
        return reject({
          status: response.statusCode,
          body: body
        });
      }
      event.knowledgeId = doc.knowledgeId;
      event.updated = event.updated;
      return ds.update({
        _id: doc._id
      }, event, {
        multi: false
      }).then(function () {
        return resolve();
      }).catch(function (err) {
        return reject(err);
      });
    });
  });
};


const deleteEvent = function (doc) {
  return new Promise(function (resolve, reject) {
    var options = {
      uri: config.app.knowledge_url + '/api/knowledges/' + doc.knowledgeId,
      headers: {
        'Content-type': 'application/json',
        'PRIVATE-TOKEN': config.app.knowledge_token
      },
      proxy: config.app.proxy
    };
    logger.app.debug(JSON.stringify(options));
    request.delete(options, function (error, response, body) {
      if (error) return reject(error);
      logger.app.debug(response.statusCode);
      logger.app.debug(body);
      if (response.statusCode !== 200 && response.statusCode !== 404) {
        return reject({
          status: response.statusCode,
          body: body
        });
      }
      return ds.remove({
        _id: doc._id
      }, {
        multi: false
      }).then(function () {
        return resolve();
      }).catch(function (err) {
        return reject(err);
      });
    });
  });
};



module.exports = function (file) {
  let filename = config.app.ical_directory + file;
  logger.app.trace(filename);
  let existsEvents = {};
  return ds.find({
    type: 'EVENT',
    start: { $gte: new Date()}
  }).then(function(docs) {
    // 本日以降で保存したイベントを取得
    logger.app.trace(docs);
    docs.forEach(function(doc) {
      existsEvents[doc.uid] = doc;
    });
    return parseIcs(filename);
  }).each(function (event) {
    logger.app.trace(event);
    return ds.findOne({
      type: 'EVENT',
      uid: event.uid
    }).then(function (doc) {
      if (!doc) {
        logger.app.info(getDebugMsg('[登録開始]:', event));
        // ここで情報をKnowledgeに送る
        return postEvent(event);
      } else {
        if (event.updated > doc.updated) {
          logger.app.info(getDebugMsg('[更新開始]:', event));
          // ここで情報をKnowledgeに送る
          return putEvent(event, doc);
        } else {
          logger.app.debug(getDebugMsg('(Skip) 既に登録済:', event));
        }
      }
    }).then(function() {
      delete existsEvents[event.uid];
    });
  }).then(function() {
    // 前に登録していて、icsから削除されたもの
    let ids = Object.keys(existsEvents);
    return ids;
  }).each(function(uid) {
    let doc = existsEvents[uid];
    if (moment(doc.start).valueOf() < new Date().getTime()) {
      logger.app.debug('[過去の情報であるため削除しない]' + JSON.stringify(doc));
      // 過去のものは消さない（本日以降で保存したイベントを取得しているため、ここに入ることは無いが念のため）
      return Promise.resolve();
    } else if (filename !== doc.filename) {
      logger.app.debug('[別ファイルの情報なので削除しない]' + JSON.stringify(doc));
      // 異なるファイル名のものも消さない
      return Promise.resolve();
    }
    logger.app.info('[削除開始]' + JSON.stringify(doc));
    return deleteEvent(doc);
  }).then(function () {
    ds.findOne({
      type: 'FILE',
      filename: file
    });
  }).then(function (doc) {
    var stat = fs.statSync(config.app.ical_directory + file);
    if (!doc) {
      return ds.insert({
        type: 'FILE',
        filename: file,
        updated: stat.mtime
      });
    } else {
      doc.updated = stat.mtime;
      return ds.update(doc);
    }
  }).then(function () {
    logger.app.info(file + ' is completed.');
  });
};
