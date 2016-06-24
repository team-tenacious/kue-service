describe('1_eventemitter_embedded_sanity', function() {

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
        console.log('job result is:::', result);
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

});
