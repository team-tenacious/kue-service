describe('1 sanity', function() {

  var expect = require('expect.js');
  var path = require('path');
  this.timeout(60000);

  before('should initialize the service', function(callback) {
    callback();
  });

  after(function(callback) {
    callback();
  });

  it('should start up a test job site', function(callback) {
    var KueService = require('../lib/queue-manager');
    var config = {site:__dirname + path.sep + 'test-site'};

    kueService = new KueService();

    kueService.start(config, function(e){
      if (e) return callback(e);

      kueService.stop(callback);
    });

  });

  it('should start up a test job site, push a test job through', function(callback) {
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

  });

  it('should start up a test job site, check a scheduled job ran', function(callback) {

    var KueService = require('../lib/queue-manager');
    var config = {site:__dirname + path.sep + 'test-site-schedule'};

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
  });

});
