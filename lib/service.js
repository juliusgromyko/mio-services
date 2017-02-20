// Micro services library based on RabbitMQ/amqplib
// Service API
// Created for MIO server | www.MakeItOnce.net
// Author: Julius Gromyko | juliusgromyko@gmail.com
// Julius Gromyko (C) 2017

const connection = require('./connection');

// Create Service
function create(options, cb){
  // Create callbacks holder
  var cbs = [];

  // Create Broker Processor
  var processor = function(err, res){
    if(err) return cb(err);

    res.channel.prefetch(1);

    // Parse requests
    res.channel.consume(res.queue.queue, function reply(msg) {
      // Check if we know where to reply
      if(msg.properties && msg.properties.replyTo && msg.properties.correlationId && msg.properties.type){
        var cb = cbs[msg.properties.type];
        if(cb){
          // Call cmd parser
          var data = JSON.parse(msg.content.toString());
          cb(data, (err, result)=>{
            var response = {
              error: null,
              data: null
            };

            // If can't parse/complete request - than return task to queue
            if(err){
              if(err.hasOwnProperty('message') && err.message){
                response.error = {message: err.message};
              }else if(typeof err === "string" || err instanceof String){
                response.error = {message: err};
              }else{
                response.error = {message: 'Unknown Error'};
              }
            }else{
              response.data = result || {}
            };

            // Send response
            res.channel.sendToQueue(msg.properties.replyTo,
              new Buffer(JSON.stringify(response)),
              {correlationId: msg.properties.correlationId});

            res.channel.ack(msg);
            return;
          });
        }
      }else{
        // Reject message if not valid
        res.channel.nack(msg);
      }
    });
  };

  // Create Service Broker
  var brokerOptions = {
    processor: processor,
    name: [options.name, 'rpc_queue'].join('_'),
    server: options.server,
    queueFlags: {durable: false},
    expires: options.expires
  };

  connection.createBroker(brokerOptions);

  // Return service object
  var serviceObj = {
    name: options.name,
    callbacks: cbs,
    listen: (cmd, cb) => {
      if(cmd && cb){
        cbs[cmd] = cb;
      }
    }
  };
  cb(null, serviceObj);
}

// Export section
module.exports = {
  create: create
};
