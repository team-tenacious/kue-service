describe('jobs/workers/processor', function() {

  var expect = require('chai').expect;
  var path = require('path');
  this.timeout(5000);

  var workerPath = __dirname + path.sep + 'test-site' + path.sep + 'workers';

  it('should initialize the foreman', function(done){

    var Foreman = require('../lib/foreman');
    var foreman = new Foreman();
    var config = {workerPath:workerPath};

    foreman.initialize(config, done);

  });

  it('should test the workers', function(done){

    var Foreman = require('../lib/foreman');
    var foreman = new Foreman();
    var config = {workerPath:workerPath};

    foreman.initialize(config, function(e){

      if (e) return done(e);

      foreman.test(done);

    });

  });

  it('should start the workers', function(done){

    var Foreman = require('../lib/foreman');
    var foreman = new Foreman();
    var config = {workerPath:workerPath};

    foreman.initialize(config, function(e){

      if (e) return done(e);

      foreman.start(done);

    });

  });

  it('should stop the workers', function(done){

    var Foreman = require('../lib/foreman');
    var foreman = new Foreman();
    var config = {workerPath:workerPath};

    foreman.initialize(config, function(e){

      if (e) return done(e);

      foreman.start(function(e){
        if (e) return done(e);
        foreman.stop(done);
      });

    });

  });

});