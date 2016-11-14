const services = require('./mio-services');

services.client(null, (err, cli) => {
  if(err){
    console.log(err);
  }else{

    // Call checkUser cmd
    cli.call('demo', 'sayHello', {test: 'hello!'}, (data)=>{
      console.log('Get Reponse:');
      console.log(data);
    });
  }
});
