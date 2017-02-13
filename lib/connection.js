// Micro services library based on RabbitMQ/amqplib
// Connection API
// Created for MIO server | www.MakeItOnce.net
// Author: Julius Gromyko | juliusgromyko@gmail.com
// Julius Gromyko (C) 2017

const amqp = require('amqplib/callback_api');
const uuid = require('uuid');

// ----------------- Brokers
var brokers = [];

// Recreate Brokers Daemon
var brokersGuard = setInterval(()=>{
  var brokersToRestart = brokers.filter((item)=>{
    return item.restart || false;
  });

  for (var i = 0; i < brokersToRestart.length; i++) {
    brokersToRestart[i].restart = false;
    checkBrockerConnections(brokersToRestart[i]);
  }
}, 5000);

// Create/ReCreate Broker Network connections
function checkBrockerConnections(broker){
  connect(broker, (err, connection)=>{
    if(err){
      console.log(err);
      broker.restart = true;
    }else{
      channel(connection, broker, broker.processor);
    }
  });
}

// Create New Broker
function createBroker(options){
  var broker = {
    processor: options.processor
  };

  // Extract Broker UUID Name
  if(options && options.uuid){
    broker.uuid = options.uuid;
  }else{
    broker.uuid = uuid.v4();
  }

  // Extract Server Names
  if(options && options.server){
    broker.server = options.server;
  }
  if(!broker.server) broker.server = 'localhost';
  if(!broker.server.substring(0,7) !== 'amqp://') broker.server = 'amqp://'+broker.server;

  // Extract Service Name
  if(options && options.name){
    broker.name = options.name;
  }else{
    broker.name = broker.uuid;
  }

  // Extract Queue Flags
  if(options && options.queueFlags){
    broker.queueFlags = options.queueFlags;
  }else{
    broker.queueFlags = {};
  }

  // Extract TTL/Expiration Time
  if(options && options.expires){
    broker.expires = options.expires;
    broker.queueFlags.arguments = {messageTtl: options.expires};
  }

  // Push To Brokers List
  brokers.push(broker);

  // Create/ReCreate network connetions
  checkBrockerConnections(broker);
}

// Get Broker By UUID
function getBrocker(uuid){
  for (var i = 0; i < brokers.length; i++) {
    if(brokers[i].uuid == uuid){
      return brokers[i];
    }
  }
  return undefined;
}

// ----------------- Connections to server

// Store builded connections and share them
var connection = [];

// Connect to server and reconnect if needed
function connect(broker, cb){
  var amqpServer = broker.server;
  if(!amqpServer) amqpServer = 'localhost';
  if(amqpServer.substring(0,7) !== 'amqp://') amqpServer = 'amqp://'+amqpServer;

  // If connection already exists
  if(connection[amqpServer]){
    return cb(null, connection[amqpServer]);
  }

  // Remove Old Brocker Connection Data
  delete broker.queue;
  delete broker.channel;

  amqp.connect(amqpServer, function(err, conn) {
    if(err) return cb(err);

    connection[amqpServer] = conn;

    // If connection Closed - try to reconnect
    connection[amqpServer].on('close', function(){
      if(connection[amqpServer]){
        connection[amqpServer] = undefined;
        delete connection[amqpServer];
      }
      console.error('AMQP Closed Connection. Reconecting...');
      broker.restart = true;
    });
    connection[amqpServer].on('error', function(err){
      if(connection[amqpServer]){
        connection[amqpServer] = undefined;
        delete connection[amqpServer];
      }
      console.error('AMQP Error. Reconecting...');
      console.error(err);
      broker.restart = true;
    });

    // Return created connection
    return cb(null, connection[amqpServer]);

  });
}

// ----------------- Channels

// Create Consuming Channel
function channel(connection, broker, cb){

  connection.createChannel(function(err, ch) {
    if(err) return cb(err);

    broker.channel = ch;

    ch.assertQueue(broker.name, broker.queueFlags, function(err, q) {
      if(err) return cb(err);

      broker.queue = q;

      return cb(null, {channel: ch, queue: q});
    });

    // On Error or Close Event
    ch.on('error', (err)=>{
      console.log('AMQP Got Error on Channel. Recreating...');
      console.log(err);
      broker.restart = true;
    });
    ch.on('close', ()=>{
      console.log('AMQP Closed Channel. Recreating...');
      broker.restart = true;
    });
  });
}

// Export section
module.exports = {
  connect: connect,
  channel: channel,
  createBroker: createBroker,
  checkBrockerConnections: checkBrockerConnections,
  getBrocker: getBrocker
};
