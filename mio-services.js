// Micro services library based on RabbitMQ/amqplib
// Created for MIO server | www.MakeItOnce.net
// Author: Julius Gromyko | juliusgromyko@gmail.com
// Julius Gromyko (C) 2016

const amqp = require('amqplib/callback_api');
const uuid = require('uuid');

// Micro service server
function service(name, amqpServer, cb){
  if(!amqpServer) amqpServer = 'localhost';
  if(!amqpServer.substring(0,7) !== 'amqp://') amqpServer = 'amqp://'+amqpServer;

  amqp.connect(amqpServer, function(err, conn) {
    if(err) return cb(err);
    conn.createChannel(function(err, ch) {
      if(err) return cb(err);

      // Create request queue
      var q = [name, 'rpc_queue'].join('_');
      ch.assertQueue(q, {durable: false});
      ch.prefetch(1);

      // Create callbacks holder
      var cbs = [];

      // Parse requests
      ch.consume(q, function reply(msg) {
        // Check if we know where to reply
        if(msg.properties && msg.properties.replyTo && msg.properties.correlationId && msg.properties.type){
          var cb = cbs[msg.properties.type];
          if(cb){
            // Call cmd parser
            var data = JSON.parse(msg.content.toString());
            cb(data, (err, result)=>{
              // If can't parse/complete request - than return task to queue
              if(err){
                ch.nack(msg);
                return;
              }

              // Send response
              ch.sendToQueue(msg.properties.replyTo,
                new Buffer(JSON.stringify(result || {})),
                {correlationId: msg.properties.correlationId});

              ch.ack(msg);
              return;
            });
          }
        }else{
          // Reject message if not valid
          ch.nack(msg);
        }
      });

      // Return service object
      var serviceObj = {
        name: name,
        channel: ch,
        queue: q,
        callbacks: cbs,
        listen: (cmd, cb) => {
          if(cmd && cb){
            cbs[cmd] = cb;
          }
        }
      };
      cb(null, serviceObj);
    });
  });
}

// Micro service client
function client(amqpServer, cb){
  if(!amqpServer) amqpServer = 'localhost';
  if(!amqpServer.substring(0,7) !== 'amqp://') amqpServer = 'amqp://'+amqpServer;

  amqp.connect(amqpServer, function(err, conn) {
    if(err) return cb(err);
    conn.createChannel(function(err, ch) {
      if(err) return cb(err);

      // Init personal queue for responses
      ch.assertQueue('', {exclusive: true}, function(err, q) {
        if(err) return cb(err);

        var expectedQueue = [];

        // Listen for responses
        ch.consume(q.queue, function(msg) {

          // Check if we expecting for such response
          var corrId = msg.properties.correlationId ;
          if(expectedQueue[corrId]){
            var resolver = expectedQueue[corrId];
            delete expectedQueue[corrId];

            var data = JSON.parse(msg.content.toString());
            resolver(null, data);
          }
        }, {noAck: true});


        // Return client object
        var clientObj = {
          channel: ch,
          replyQueue: q,
          call: (service, cmd, data, cb)=>{
            // Call service command with provided data
            var corrId = uuid.v4();
            expectedQueue[corrId] = cb;
            ch.sendToQueue([service, 'rpc_queue'].join('_'),
              new Buffer(JSON.stringify(data || {})),
            { type: cmd, correlationId: corrId, replyTo: q.queue });
          }
        };
        cb(null, clientObj);
      });
    });
  });
}

module.exports = {
  service: service,
  client: client
};
