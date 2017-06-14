const sleep = require('sleep');
const process = require('process');
const fetch = require('node-fetch');

const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-find'));

const {
  mainDb,
  eventsDb,
  notificationsDb,
  archiveDb,
  sharedDb,
  publicDb,
  authDb,
  anonymousDb
} = require('experimental-server');

const COUCHDB_USER = process.env.COUCHDB_USER;
const COUCHDB_PASSWORD = process.env.COUCHDB_PASSWORD;

const mainReplicatorUrl = "http://main-db:5984/_replicator";
const eventsReplicatorUrl = "http://events-db:5984/_replicator";
const notificationsReplicatorUrl = "http://notifications-db:5984/_replicator";
const archiveReplicatorUrl = "http://archive-db:5984/_replicator";

const createDB = dbUrl => {
  return new PouchDB(dbUrl, {
  	ajax: {
  		cache: false,
  		timeout: 60000
  	},
  	auth: {
  		username: COUCHDB_USER,
  		password: COUCHDB_PASSWORD
  	}
  });
}

const mainReplicator = createDB(mainReplicatorUrl);
const eventsReplicator = createDB(eventsReplicatorUrl);
const notificationsReplicator = createDB(notificationsReplicatorUrl);
const archiveReplicator = createDB(archiveReplicatorUrl);


const mainDbUrl = `http://${COUCHDB_USER}:${COUCHDB_PASSWORD}@main-db:5984/db`;
const eventsDbUrl = `http://${COUCHDB_USER}:${COUCHDB_PASSWORD}@events-db:5984/events`;
const notificationsDbUrl = `http://${COUCHDB_USER}:${COUCHDB_PASSWORD}@notifications-db:5984/notifications`;
const archiveDbUrl = `http://${COUCHDB_USER}:${COUCHDB_PASSWORD}@archive-db:5984/archive`;


fetch(`http://${COUCHDB_USER}:${COUCHDB_PASSWORD}@auth-db:5984/_users`, { method: 'PUT'});

for(db of [mainDb, eventsDb, notificationsDb, archiveDb, sharedDb, publicDb, anonymousDb]){
  db.createIndex({
    index: {
      fields: [{
        createdAt: "desc"
      }]
    }
  });
}




mainReplicator.put({
  _id: "main_to_events",
  source: mainDbUrl,
  target: eventsDbUrl,
  continuous: true,
  selector: {
    type: "EVENT"
  }
});
eventsReplicator.put({
  _id: "events_to_main",
  source: eventsDbUrl,
  target: mainDbUrl,
  continuous: true
});

mainReplicator.put({
  _id: "main_to_notifications",
  source: mainDbUrl,
  target: notificationsDbUrl,
  continuous: true,
  selector: {
    type: "notification"
  }
});
notificationsReplicator.put({
  _id: "notifications_to_main",
  source: notificationsDbUrl,
  target: mainDbUrl,
  continuous: true
});

mainReplicator.put({
  _id: "main_to_archive",
  source: mainDbUrl,
  target: archiveDbUrl,
  continuous: true,
  selector: {
    type: "EVENT",
    status: "done"
  }
});
archiveReplicator.put({
  _id: "archive_to_main",
  source: archiveDbUrl,
  target: mainDbUrl,
  continuous: true
});
