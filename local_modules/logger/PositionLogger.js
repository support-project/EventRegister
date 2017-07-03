var callsite = require('callsite');
var path = require('path');
var log4js = require('log4js');

var getCallsiteStr = function() {
    var call = callsite()[2];
    var file = path.relative(process.cwd(), call.getFileName());
    var line = call.getLineNumber();
    return '[' + file + ':' + line + '] -';
};

var PositionLogger = function(logger) {
    if (process.env.NODE_LOGGER_HIDELINES) {
        return logger;
    }

    this.logger = logger;
};

PositionLogger.prototype.setLevel = function(level) {
    this.____level = level;
    this.logger.setLevel(level);
};

var logFactory = function(level) {
    return function() {
        if (this.logger.isLevelEnabled(level)) {
            var logFunc = this.logger[level.toString().toLowerCase()];
            [].unshift.call(arguments, getCallsiteStr());
            logFunc.apply(this.logger, arguments);
        }
    };
};

for (var level in log4js.levels) {
    PositionLogger.prototype[level.toLowerCase()] = logFactory(level);
}

PositionLogger.prototype.isTraceEnable = function() {
    if (this.____level === 'TRACE' || this.____level === 'ALL') {
        return true;
    }
    return false;
};
PositionLogger.prototype.isDebugEnable = function() {
    if (this.isTraceEnable() || this.____level === 'DEBUG') {
        return true;
    }
    return false;
};
PositionLogger.prototype.isInfoEnable = function() {
    if (this.isDebugEnable() || this.____level === 'INFO') {
        return true;
    }
    return false;
};

PositionLogger.prototype.debugHeapUsed = function(prefix) {
    if (this.isDebugEnable()) {
        if (!prefix) {
            prefix = '';
        }
        var heapUsed = process.memoryUsage().heapUsed;
        this.debug(prefix + 'Program is using ' + heapUsed + ' bytes of Heap.');
    }
};

module.exports = PositionLogger;
