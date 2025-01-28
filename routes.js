const handler = require('./handler');

const routes = [
  {
    method: 'POST',
    path: '/api/register',
    handler: handler.registerUser,
  },
  {
    method: 'POST',
    path: '/api/verify-otp',
    handler: handler.verifyOTP,
  },
  {
    method: 'POST',
    path: '/api/login',
    handler: handler.loginUser,
  },
  {
    method: 'POST',
    path: '/api/user/{userId}/skin-health',
    handler: handler.addSkinHealthDataForUser,
  },
  {
    method: 'GET',
    path: '/api/user/{userId}/skin-health',
    handler: handler.getSkinHealthDataForUser,
  },
  {
    method: 'POST',
    path: '/api/reset-password',
    handler: handler.requestPasswordReset,
  },
  {
    method: 'POST',
    path: '/api/reset-password/confirm',
    handler: handler.confirmPasswordReset,
  },
  {
    method: 'POST',
    path: '/api/upload',
    options: {
      payload: {
        output: 'stream', 
        parse: true,      
        allow:'multipart/form-data', 
        multipart: true,
        maxBytes: 5 * 1024 * 1024,   
      },
    },
    handler: handler.uploadImage,
  },  
  {
    method: 'GET',
    path: '/api/latest-image/{userId}',
    handler: handler.getLatestImage,
  },
  {
    method: 'POST',
    path: '/api/save-history',
    options: {
      payload: {
        output: 'data',
        parse: true,
      },
    },
    handler: handler.saveDiseaseHistory,
  },  
  {
    method: 'GET',
    path: '/api/{userId}/history',
    handler: handler.getDiseaseHistory
  },
  {
    method: 'POST',
    path: '/api/predict',
    options: {
      payload: {  
        allow:'multipart/form-data', 
        multipart: true,
        maxBytes: 5 * 1024 * 1024, 
      }
    },
    handler: handler.postPredictHandler
  },
  {
    method: 'POST',
    path: '/api/predict-upload',
    options: {
      payload: {
        output: 'stream', 
        parse: true,      
        allow:'multipart/form-data', 
        multipart: true,
        maxBytes: 5 * 1024 * 1024,   
      },
    },
    handler: handler.postPredictAndUploadHandler,
  },
  {
    method: 'GET',
    path: '/api/predict/{userId}',
    handler: handler.getPredictionsHandler,
  }
];

module.exports = routes;
