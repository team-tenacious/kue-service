function TestWorker(){}

TestWorker.prototype.initialize = function(callback){
  this.__log.info('initialized test worker');
  callback();
}

TestWorker.prototype.start = function(callback){
  this.__log.info('started test worker');
  callback();
}

TestWorker.prototype.stop = function(callback){
  this.__log.info('stopped test worker');
  callback();
}

TestWorker.prototype.process = function(testjob, callback){
  this.__log.info('ran process function', testjob.data);
  testjob.data.addedField = 'test';
  callback(null, testjob.data);
}

TestWorker.prototype.test = function(callback){

  callback();
}

module.exports = TestWorker;




