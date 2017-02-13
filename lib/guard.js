// Micro services library based on RabbitMQ/amqplib
// TimeOut Guard
// Created for MIO server | www.MakeItOnce.net
// Author: Julius Gromyko | juliusgromyko@gmail.com
// Julius Gromyko (C) 2017

const uuid = require('uuid');

var guards = [];
var timeoutGuard;

// Init CallBack Guard
var _inited = false;
function init(options){
  if(_inited) return;

  var ttl = 5000;
  if(options && options.expires){
    ttl = options.expires;
  }

  // Check timeouted requests
  timeoutGuard = setInterval(function () {
    for (var corrId in guards) {
      if (guards.hasOwnProperty(corrId)) {
        if((new Date().getTime() - guards[corrId].sended)>guards[corrId].ttl){
          var resolver = guards[corrId].cb;
          delete guards[corrId];
          resolver(new Error('Timeout'), null);
        }
      }
    }
  }, ttl);

  _inited = true;
}

// Wait for callBack
function wait(options, cb){
  var packetOptions = {
    correlationId: uuid.v4()
  };

  var guard = {
    cb: cb,
    sended: new Date().getTime()
  };

  if(options.signature){
    guard.signature = options.signature;
  }

  if(options && options.expires){
    guard.ttl = options.expires;
    packetOptions.expiration = options.expires;
  }

  guards[packetOptions.correlationId] = guard;

  return packetOptions;
}

// Income CorrID Package
function income(corrId, data){
  if(guards[corrId]){
    var resolver = guards[corrId].cb;
    delete guards[corrId];

    resolver(null, data);
  }
}

// Get Request Info
function info(corrId){
  if(guards[corrId]){
    return guards[corrId];
  }
}

// Export section
module.exports = {
  init: init,
  wait: wait,
  income: income,
  info: info
};
