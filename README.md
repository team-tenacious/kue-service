#Kue Service

*using the builing metaphor for this, all jobs have a site, this is where workers convene and are managed by a foreman. The Kue service has been wrapped to allow us to define a set of jobs in a site directory, each workers filenames match the job name, a .json file matching the workers name can be added to allow for settings and scheduling*

*NB - the queue-manager starts up a site, in a separate process - the idea is that we will allow for multiple processes to be run, in a cluster format in future, but for now if something goes wrong, ps -ef | grep node is your friend :)*

*thanks to the guys from [kue](https://github.com/Automattic/kue) and [node-schedule](https://github.com/node-schedule/node-schedule) for making this possible*

#installation

```bash
npm install kue-service --save
```

#examples:

with directory structure:

```
test-site
    |__workers
        |__test.js
        |__test.json
    config.js
```

*config.js:*
```javascript
var path = require('path');

module.exports = {
  workerPath:__dirname + path.sep + 'workers'
}
```

*test.js*
```javascript
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

```
*test.json - what is of interest here is that you can configure jobs to run according to a schedule, to see the schedule params check out: github.com/node-schedule/node-schedule*
```
{
  "parameters":{
    "test":"param"
  },
  "schedule":{
    "params":{
      "second":[0,5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85.90,95]
    }
  }
}
```

you start the service like so, this is from the unit test - shows how a scheduled job runs:
```javascript

var KueService = require('kue-service');
//path to your test site folder
var config = {site:__dirname + path.sep + 'test-sit'};

kueService = new KueService();
var runCount = 0;
kueService.start(config, function(e){
  if (e) return callback(e);

  kueService.queue.on('job complete', function(job){
    runCount++;
  });

  setTimeout(function(){

    return kueService.stop(function (e) {
      expect(runCount > 0).to.be(true);
      callback(e);
    });

  }, 15000);

});

```

you kick off a job explicitly by calling the queue:
```javascript

var KueService = require('../lib/queue-manager');
var config = {site:__dirname + path.sep + 'test-site'};

kueService = new KueService();

kueService.start(config, function(e){
  if (e) return callback(e);

  var job = kueService.queue.create('test', {'test':'params'});

  job.on('complete', function(result){
    kueService.stop(callback);
  });

  job.save(function(e) {
      if (e) {
        console.warn('error queueing job', e);
        return kueService.stop(function (e) {
          callback(e);
        });
      }
    }
  );
});

```

#Disclaimer and license
Use at own risk, MIT license