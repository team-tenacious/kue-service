var Logger = require('log4js')
  , commander = require('commander')

commander

  .option('--conf [file]','config')
  .parse(process.argv);

var __state = 'pending';
var __config = {};

if (commander.conf)
  __config = require(commander.conf);

if (!__config.log)
  __config.log = {
    appenders: [
      { type: 'console' }
    ]
  };

var log4js = require('log4js');
log4js.configure(__config.log);

log = log4js.getLogger();

var trySend = function(code, data){
  try{
    var message = code;

    if (data)
      message = message + ":::" + JSON.stringify(data);

    process.send(message);
  }catch(e){
    console.warn('message send failed, be sure to call with process with fork');
  }
}

var terminate = function(code){

  if (code == null || code == undefined)
    code = 'default';

  var termTimeout = setTimeout(function(){
    console.warn('tasks not finishing in time, forcing close');
    trySend('stopped');
    process.exit(0);
  }, 60000);

  if (__state == 'started'){
    return foreman.stop(function(e){
      if (e)  console.warn('failed to stop foreman: ' + e.toString());
      console.log('stopped foreman, ready to terminate');
      trySend('stopped');
      process.exit(0);
    });
  }

  process.exit(0);
}

var Foreman = require('./foreman');
var foreman = new Foreman();

console.log('starting processor');

foreman.initialize(__config, function(e){

  if (e){
    console.warn('failed to initialize foreman: ' + e.toString());
    return terminate();
  }

  foreman.start(function(e){

    if (e){
      console.warn('failed to start foreman: ' + e.toString());
      return terminate();
    }

    __state = 'started';
    console.log('job site up');
    trySend(__state);
  })

});

process.on('SIGTERM', function(code) {
  return terminate(code);
});

process.on('SIGINT', function(code) {
  return terminate(code);
});






