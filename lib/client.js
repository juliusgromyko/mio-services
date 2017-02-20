// Micro services library based on RabbitMQ/amqplib
// Client/Consumer API
// Created for MIO server | www.MakeItOnce.net
// Author: Julius Gromyko | juliusgromyko@gmail.com
// Julius Gromyko (C) 2017

const connection = require('./connection');
const cache = require('./cache');
const guard = require('./guard');
const uuid = require('uuid');

// Create Service
function create(options, cb){
  guard.init(options);

  if(options.useCache){
    cache.init(options);
  }

  // Client Broker Processor
  var processor = function(err, res){
    if(err || !res.queue || !res.channel) return cb(err);

    // Listen for responses
    res.channel.consume(res.queue.queue, function(msg) {
      // Check if we expecting for such response
      if(msg && msg.properties && msg.properties.correlationId && msg.content){

        var _data = JSON.parse(msg.content.toString());
        var corrId = msg.properties.correlationId;

        // Udate Cache
        if(options.useCache && _data.data){
          var cacheKey = guard.info(corrId).signature;
          if(cacheKey){
            cache.set(cacheKey, _data.data);
          }
        }
        guard.income(corrId, _data);
      }
    }, {noAck: true});
  };

  // Create Client Broker
  var brokerOptions = {
    uuid: uuid.v4(),
    processor: processor,
    server: options.server,
    queueFlags: {exclusive: true},
    expires: options.expires
  };

  connection.createBroker(brokerOptions);

  // Return client object
  var clientObj = {
    call: (service, cmd, data, cb)=>{
      var broker = connection.getBrocker(brokerOptions.uuid);
      if(!broker || !broker.queue || !broker.channel){
        return cb(new Error('Service Not Available'));
      }

      var _data = new Buffer(JSON.stringify(data || {}));

      // Check Cache
      options.signature = undefined;
      if(options.useCache){
        options.signature = service+':'+cmd+'('+_data+')';
        var cachedResp = cache.get(options.signature);
        if(cachedResp){
          return cb(null, cachedResp);
        }
      }

      // If no cache found
      // Call service command with provided data
      var msgOptions = guard.wait(options, cb);
      msgOptions.type = cmd;
      msgOptions.replyTo = broker.queue.queue;
      broker.channel.sendToQueue([service, 'rpc_queue'].join('_'), _data, msgOptions);
    }
  };
  cb(null, clientObj);
}

// Export section
module.exports = {
  create: create
};
