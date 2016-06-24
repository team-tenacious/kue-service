function ScheduleWorker(){}

ScheduleWorker.prototype.initialize = function(callback){
  this.__log.info('initialized test worker');
  callback();
}

ScheduleWorker.prototype.start = function(callback){
  this.runCount = 0;
  this.__log.info('started test worker');
  callback();
}

ScheduleWorker.prototype.stop = function(callback){
  this.__log.info('stopped test worker');
  callback();
}

ScheduleWorker.prototype.process = function(testjob, callback){
  this.__log.info('ran scheduled process function', testjob.data);
  testjob.data.addedField = 'test1';
  this.runCount++;
  callback(null, testjob.data);
}

ScheduleWorker.prototype.test = function(callback){

  callback();
}

module.exports = ScheduleWorker;
