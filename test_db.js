const getDbConnection = require('./src/db/connection.js');
getDbConnection().then(db => {
    console.log('DB Connected');
}).catch(err => {
    console.error('Failed to connect', err);
});
