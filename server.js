const Hapi = require('@hapi/hapi');
const routes = require('./routes');
const loadModel = require('./loadModel');
require('dotenv').config();

const init = async () => {
  const server = Hapi.server({
    port: process.env.PORT || 5000,
    host: process.env.HOST || 'localhost',
  });

  const model = await loadModel();
  server.app.model = model;

  // Tambahkan rute dari file routes.js
  server.route(routes);

  await server.start();
  console.log(`Server running on ${server.info.uri}`);
};

process.on('unhandledRejection', (err) => {
  console.error(err);
  process.exit(1);
});

init();
