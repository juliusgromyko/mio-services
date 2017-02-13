// Micro services library based on RabbitMQ/amqplib
// Cache Requests
// Created for MIO server | www.MakeItOnce.net
// Author: Julius Gromyko | juliusgromyko@gmail.com
// Julius Gromyko (C) 2017

var cachedRequests = [];
var cacheCleaner;

// CleanUp Old cache
var _inited = false;
function init(options){
  if(_inited) return;

  var ttl = 5000;
  if(options && options.expires){
    ttl = options.expires;
  }

  cacheCleaner = setInterval(function () {
    for (var signature in cachedRequests) {
      if (cachedRequests.hasOwnProperty(signature)) {
        if((new Date().getTime() - cachedRequests[signature].created)>ttl){
          delete cachedRequests[signature];
        }
      }
    }
  }, ttl);

  _inited = true;
}

// Check for cached call
function get(key){
  if(cachedRequests[key]){
    return cachedRequests[key].value;
  }else{
    return undefined;
  }
}

// Set cached results
function set(key, value){
  cachedRequests[key] = {
    value: value,
    created: new Date().getTime()
  };
}

// Export section
module.exports = {
  init: init,
  get: get,
  set: set
};
