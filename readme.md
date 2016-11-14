# MIO MicroServices Lib
NodeJS microservices with callbacks based on RabbitMQ queues

# Quick Start
1) Run RabbitMQ on your machine. You can use docker image for it: *docker run d -p 5672:5672  --name rabbitmq rabbitmq*
2) Run sample service: *node service.js*
3) Run sample client: *node client.js*

# HowTo
**service(name, amqpServer, cb)** - create new microservice
 - **name** - microservice name
 - **amqpServer** - if null, than use localhost
 - **cb(err, srv)** - callback function, where err - error info, srv - object representing service data

**srv.listen(CMD, processor)** - adding logic for command
 - **CMD** - command name
 - **processor(data, cb)** - processing function

**client(amqpServer, cb)** - create new microservice client for consumer
 - **amqpServer** - if null, than use localhost
 - **cb(err, cli)** - callback function, where err - error info, cli - object representing service data

**cli.call(serviceName, CMD, data, cb)** - execute command at microservice
 - **serviceName** - microservice name
 - **CMD** - command name
 - **data** - JSON data, or null
 - **cb(data)** - optional callback for result of execution
