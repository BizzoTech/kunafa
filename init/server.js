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

(async() => {
 try {

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

  const mainReplicator = await createDB(mainReplicatorUrl);
  const eventsReplicator = await createDB(eventsReplicatorUrl);
  const notificationsReplicator = await createDB(notificationsReplicatorUrl);
  const archiveReplicator = await createDB(archiveReplicatorUrl);

  const mainDbUrl = `http://${COUCHDB_USER}:${COUCHDB_PASSWORD}@main-db:5984/db`;
  const eventsDbUrl = `http://${COUCHDB_USER}:${COUCHDB_PASSWORD}@events-db:5984/events`;
  const notificationsDbUrl = `http://${COUCHDB_USER}:${COUCHDB_PASSWORD}@notifications-db:5984/notifications`;
  const archiveDbUrl = `http://${COUCHDB_USER}:${COUCHDB_PASSWORD}@archive-db:5984/archive`;

  await fetch(`http://${COUCHDB_USER}:${COUCHDB_PASSWORD}@auth-db:5984/_users`, {method: 'PUT'});

  for (db of[mainDb,
   eventsDb,
   notificationsDb,
   archiveDb,
   sharedDb,
   publicDb,
   anonymousDb]) {
   await db.createIndex({
    index: {
     fields: [
      {
       createdAt: "desc"
      }
     ]
    }
   });
  }

  try {
   await mainReplicator.put({
    _id: "main_to_events",
    source: mainDbUrl,
    target: eventsDbUrl,
    continuous: true,
    selector: {
     type: "EVENT"
    }
   });
  } catch (e) {
   if (e.status != 409) {
    throw e;
   }
  }

  try {
   await eventsReplicator.put({_id: "events_to_main", source: eventsDbUrl, target: mainDbUrl, continuous: true});
  } catch (e) {
   if (e.status != 409) {
    throw e;
   }
  }

  try {
   await mainReplicator.put({
    _id: "main_to_notifications",
    source: mainDbUrl,
    target: notificationsDbUrl,
    continuous: true,
    selector: {
     type: "notification"
    }
   });
  } catch (e) {
   if (e.status != 409) {
    throw e;
   }
  }

  try {
   await notificationsReplicator.put({_id: "notifications_to_main", source: notificationsDbUrl, target: mainDbUrl, continuous: true});
  } catch (e) {
   if (e.status != 409) {
    throw e;
   }
  }

  try {
   await mainReplicator.put({
    _id: "main_to_archive",
    source: mainDbUrl,
    target: archiveDbUrl,
    continuous: true,
    selector: {
     type: "EVENT",
     status: "archived"
    }
   });
  } catch (e) {
   if (e.status != 409) {
    throw e;
   }
  }

 } catch (e) {
  console.log(e);
  process.exit(1);
 }
})();
