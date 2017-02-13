// Micro services library based on RabbitMQ/amqplib
// MAIN FILE
// Created for MIO server | www.MakeItOnce.net
// Author: Julius Gromyko | juliusgromyko@gmail.com
// Julius Gromyko (C) 2017

const client = require('./lib/client');
const service = require('./lib/service');

module.exports = {
  service: service.create,
  client: client.create
};
