const config = require('config');
const logger = require('logger');
const Promise = require('bluebird');

const Datastore = require('nedb');

const ds = new Datastore({
    filename: config.app.datastore,
    autoload: true
});

ds.find = Promise.promisify(ds.find);
ds.findOne = Promise.promisify(ds.findOne);
ds.insert = Promise.promisify(ds.insert);
ds.update = Promise.promisify(ds.update);
ds.remove = Promise.promisify(ds.remove);
ds.count = Promise.promisify(ds.count);

module.exports = ds;
