var path = require('path')
  , fs = require('fs')
  , kue = require('kue')
  , util = require('util')
  , async = require('async')
  , EventEmitter = require('events').EventEmitter
  , schedule = require('node-schedule');

function Foreman(){

}

Foreman.prototype.events = new EventEmitter();

Foreman.prototype.events.on('error', function(message){
  console.warn('error:' + message);
});

Foreman.prototype.__initializeWorkers = function(callback){
  var _this = this;

  _this.__workers = {};
  _this.log.info('initializing workers');

  var files = fs.readdirSync(_this.__config.workerPath);

  async.eachSeries(files, function(filename, workerCallback){

    if (!filename.endsWith('js'))
      return workerCallback();

    var filePath = _this.__config.workerPath + filename;
    var file = fs.statSync(filePath);

    if (!file.isFile())
      return workerCallback();

    var jobName = path.basename(filename, path.extname(filename));

    _this.log.info('requiring worker: ' + filePath);

    var Worker = require(filePath);
    var workerConfig = {};

    try{

      var configPath = _this.__config.workerPath + jobName + '.json';
      var configFile = fs.statSync(configPath);

      if (configFile.isFile())
        workerConfig = require(configPath);

    }catch(e) {
      _this.log.warn('failed loading service config' + e.toString());
    }

    var worker = new Worker();

    worker.__config = workerConfig;
    worker.__queue = _this.__queue;
    worker.__log = _this.log;
    worker.jobName = jobName;

    worker.initialize(function(e){

      if (e) return workerCallback(e);

      _this.__workers[jobName] = {
        instance:worker,
        job:jobName,
        config:workerConfig
      };

      workerCallback();

    });

  }, callback);

}

Foreman.prototype.stop = function(callback){
  var _this = this;

  console.log('stopping jobs:::');

  if (!_this.status == 'initialized')
    return callback(new Error('attempt to start when initialization is not complete'));

  async.eachSeries(Object.keys(_this.__workers), function(jobName, workerCallback){
    _this.__workers[jobName].instance.stop(workerCallback);
  }, function(e){
    if (e) return callback(e);

    console.log('stopped jobs:::');

    _this.__queue.shutdown( 5000, function(e) {
      if (e) console.warn('erroro with queue shutdown:' + e.toString());
      _this.status = 'stopped';
      callback();
    });

  });

}

Foreman.prototype.test = function(callback){
  var _this = this;

  if (!_this.status == 'initialized')
    return callback(new Error('attempt to start when initialization is not complete'));

  async.eachSeries(Object.keys(_this.__workers), function(jobName, workerCallback){
    _this.__workers[jobName].instance.test(workerCallback);
  }, callback);

}

Foreman.prototype.scheduleJob = function(worker){

  var jobFunction = function(){
    var scheduledJob = this.__queue.create(this.jobName, this.__config.parameters?this.__config.parameters:{});
    scheduledJob.save(function(e){
      if (e) return this.__log.error('failed to run scheduled job: ' + this.jobName);
    });
  }.bind(worker);

  this.__scheduler.scheduleJob(worker.__config.schedule.params, jobFunction);
}

Foreman.prototype.attachWorker = function(jobName, worker){
  var _this = this;

  if (!worker.process)
    throw new Error('worker does not have a process method');

  this.__queue.process(jobName, worker.process.bind(worker));

  if (worker.__config.schedule)
    _this.scheduleJob(worker);

}

Foreman.prototype.start = function(callback){
  var _this = this;

  if (!_this.status == 'initialized')
    return callback(new Error('attempt to start when initialization is not complete'));

  async.eachSeries(Object.keys(_this.__workers), function(jobName, workerCallback){
    var workerInstance = _this.__workers[jobName].instance;

    if (workerInstance.start){
      workerInstance.start(function(e){
        if (e) return workerCallback(e);
        try{
          _this.attachWorker(jobName, _this.__workers[jobName].instance);
          workerCallback();
        }catch(e){
          console.log('attache e:::', e);
          workerCallback(new Error('failed to attach worker: ' + jobName, e));
        }
      });
    }else{
      _this.attachWorker(jobName, _this.__workers[jobName].instance);
      workerCallback();
    }

  }, function(e){
    if (e) return callback(e);
    _this.status = 'started';
    callback();
  });

}

Foreman.prototype.initialize = function(config, callback){
  var _this = this;

  try{

    if (typeof config == 'function'){
      callback = config;
      config = null;
    }

    if (!config)
      config = {};

    if (!config.context)
      config.context = 'kue-service';

    if (!config.log)
      config.log = {
        appenders: [
          { type: 'console' }
        ]
      };

    var log4js = require('log4js');
    log4js.configure(config.log);

    _this.log = log4js.getLogger();

    _this.__config = config;

    _this.__scheduler = require('node-schedule');

    if (!_this.__config.workerPath)
      _this.__config.workerPath = path.resolve(__dirname + path.sep + 'workers');

    if (!_this.__config.workerPath.endsWith(path.sep))
      _this.__config.workerPath += path.sep;

    _this.log.info('worker directory: ' + _this.__config.workerPath);

    var checkWorkerDirectory = fs.statSync(_this.__config.workerPath);

    if (!checkWorkerDirectory.isDirectory())
      throw new Error('invalid worker directory');

    _this.__queue = kue.createQueue(config.queue);

    _this.__initializeWorkers(function(e){
      if (e) return callback(e);
      _this.status = 'initialized';
      callback();
    });

  }catch(e){

    if (_this.log)
    _this.log.error('initialize failed' + e.toString());

    callback(e);

  }
}

module.exports = Foreman;