function EthereumWorker(){}

EthereumWorker.prototype.initialize = function(callback){
  this.__log.info('initialized test worker');
  callback();
}

EthereumWorker.prototype.start = function(callback){
  this.__log.info('started test worker');
  callback();
}

EthereumWorker.prototype.stop = function(callback){
  this.__log.info('stopped test worker');
  callback();
}

EthereumWorker.prototype.process = function(testjob, callback){
  this.__log.info('ran process function', testjob.data);
  testjob.data.addedField = 'test';
  callback(null, testjob.data);
}

EthereumWorker.prototype.test = function(callback){

  callback();
}

module.exports = EthereumWorker;




