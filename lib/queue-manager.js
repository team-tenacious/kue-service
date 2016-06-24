var path = require('path');
var express = require('express');
var kue = require('kue');
var ui = require('kue-ui');

function QueueManager(){}


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

  var sitePath = path.resolve('.' + path.sep + 'lib' + path.sep + 'site');
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

  if (!config.site.endsWith(path.sep))
    config.site += path.sep;

  this.__config = config;
  this.__http = express();

  _this.queue = kue.createQueue({
    "redis":config.redis
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
        process.exit(code);
      })
    }
  }

  process.on('SIGTERM', function(code) {
    return terminate(code);
  });

  process.on('SIGINT', function(code) {
    return terminate(code);
  });

  this.__startProcessors(callback);

}

QueueManager.prototype.stop = function(callback){
  this.__stopProcessors(callback);
}

module.exports = QueueManager;