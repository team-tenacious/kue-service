var path = require('path');
var express = require('express');
var kue = require('kue');
var ui = require('kue-ui');
var util = require('util');

function QueueManager(){}

var EventEmitter = require('events').EventEmitter;
util.inherits(QueueManager, EventEmitter);

QueueManager.prototype.__stopProcessors = function(callback){
  try{

    var _this = this;

    if (_this.__remoteSite){
      if (this.__remoteStarted){
        _this.__remoteSite.on('message', function(data) {
          if (data == 'stopped')
            return callback();
        });
        _this.__remoteSite.kill();
      }else{
        _this.__remoteSite.kill();
        callback();
      }

    }else return callback();

  }catch(e){
    callback(e);
  }

}

QueueManager.prototype.__startProcessors = function(callback){

  var _this = this;
  var fork = require('child_process').fork;

  var sitePath = __dirname + path.sep + 'site';
  var siteConfigPath = path.resolve(this.__config.site + 'config.js');
  var siteConfig;

  try{
    siteConfig = require(siteConfigPath);
  }catch(e){return callback(new Error('site config does not exist'))}

  this.__remoteSite = fork(sitePath, ['--conf', siteConfigPath]);
  this.__remoteSite.on('message', function(data) {

    if (!this.__remoteStarted){
      if (data.toString() == 'started'){
        this.__remoteStarted = true;
        return callback();
      }
      callback(new Error(data.toString()));
    }

  });
}

QueueManager.prototype.start = function(config, callback){
  var _this = this;

  if (typeof config == 'function'){
    callback = config;
    config = null;
  }

  if (!config) return callback(new Error('config for queue not specified'));
  if (!config.site) return callback(new Error('site directory not specified'));

  if (!config.site.endsWith)
    return callback('you need node 4+ to run this system');

  if (!config.site.endsWith(path.sep))
    config.site += path.sep;

  if (!config.port)
    config.port = 9999;

  _this.__config = config;
  _this.__http = express();

  _this.queue = kue.createQueue({
    "redis":config.redis
  });

  _this.queue.on('job enqueue', function(id, type){
    _this.emit('job enqueue', [id, type]);
  }).on('job complete', function(id, result){
    _this.emit('job complete', [id, result]);
  });

  ui.setup({
    apiURL: '/api', // IMPORTANT: specify the api url
    baseURL: '/kue', // IMPORTANT: specify the base url
    updateInterval: 5000 // Optional: Fetches new data every 5000 ms
  });

  this.__http.use('/api', kue.app);
  this.__http.use('/kue', ui.app);

  var terminate = function(code){
    if (_this.__remoteStarted){
      _this.__stopProcessors(function(e){
        if (e) console.warn('unable to stop remote queue process:' + e.toString());
        _this.queue.shutdown( 5000, function(e) {
          if (e) console.warn('erroro with queue shutdown:' + e.toString());
          process.exit(code);
        });
      })
    }
  }

  process.on('SIGTERM', function(code) {
    return terminate(code);
  });

  process.on('SIGINT', function(code) {
    return terminate(code);
  });

  this.__startProcessors(function(e){

    if (e){
      console.warn('failed to start processors');
      return terminate(1);
    }

    _this.__server = _this.__http.listen(_this.__config.port, function (e) {
      if (e) return callback(e);
      console.log('listening on port: ' + _this.__config.port);
      callback();
    });

  });

}

QueueManager.prototype.stop = function(callback){
  var _this = this;
  try{
    _this.__server.close();
  }catch(e){
    console.warn('failed to stop http service');
  }
  _this.__stopProcessors(callback);
}

module.exports = QueueManager;