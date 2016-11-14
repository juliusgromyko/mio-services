const services = require('./mio-services');

services.service('demo', null, (err, srv)=>{
  if(err){
    console.log(err);
  }else{

    // Add checkUser cmd
    srv.listen('sayHello', (data, cb)=>{
      console.log('GOT DATA');
      console.log(data);

      cb(null, {ok: 'ok'});
    });
  }
});
