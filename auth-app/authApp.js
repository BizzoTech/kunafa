const express = require('express');
const bodyParser = require('body-parser');
const process = require('process');
const graph = require('fbgraph');
graph.setVersion("2.8");
graph.setAppSecret(process.env.FBSECRET);

const uuid = require('uuid');
const generatePassword = require('password-generator');

const nano = require('nano');
const Promise = require("bluebird");

const COUCHDB_USER = process.env.COUCHDB_USER;
const COUCHDB_PASSWORD = process.env.COUCHDB_PASSWORD;

const publicDb = nano(`http://${COUCHDB_USER}:${COUCHDB_PASSWORD}@public-db:5984`).use("public");
const mainDb = nano(`http://${COUCHDB_USER}:${COUCHDB_PASSWORD}@main-db:5984`).use("db");
const usersDb = nano(`http://${COUCHDB_USER}:${COUCHDB_PASSWORD}@auth-db:5984`).use("_users");

function insertDoc(db, doc) {
 return new Promise((resolve, reject) => {
  db.insert(doc, function(err, result) {
   if (!err || err.error === 'conflict') {
    resolve(result);
   } else {
    return reject(err);
   }
  });
 });
}

function profileAlreadyCreated(profileId) {
 return new Promise((resolve, reject) => {
  publicDb.get(profileId, (err, body) => {
   if (err) {
    if (err.statusCode == 404) {
     resolve(false);
    }
    reject(err);
   }
   resolve(true);
  });
 });
}

function getUserInfo(accessToken) {
 return new Promise((resolve, reject) => {
  const profileRequestParams = {
   fields: 'picture,name,first_name,birthday,education,hometown,email,is_verified,languages,last_name,locale,location,middle_name,name_format,political,quotes,relationship_status,religion,sports,about,gender,id,timezone,link,age_range',
   access_token: accessToken
  }
  graph.get("/me", profileRequestParams, (error, result) => {
   if (error) {
    return reject(error);
   } else {
    return resolve(result);
   }
  });
 }).then(user => {
  return Promise.all([
   getUserPicture('normal', accessToken),
   getUserPicture('large', accessToken)
  ]).then(pics => {
   user.image = {
    uri: pics[1].data.url,
    resized: [
     {
      size: 50,
      uri: user.picture.data.url
     }, {
      size: 100,
      uri: pics[0].data.url
     }, {
      size: 200,
      uri: pics[1].data.url
     }
    ]
   }
   return user;
  });
 });
}

function getUserPicture(type, accessToken) {
 return new Promise((resolve, reject) => {
  const profileRequestParams = {
   type: type,
   redirect: 'false',
   access_token: accessToken
  }
  graph.get('/me/picture', profileRequestParams, (error, result) => {
   if (error) {
    return reject(error);
   } else {
    return resolve(result);
   }
  });
 });
}

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.post('/facebook', async(req, res, next) => {

 try {
  const accessToken = req.body.accessToken;
  const result = await getUserInfo(accessToken);
  const name = 'fbuser' + result.id + "_" + uuid.v4();
  const password = generatePassword(20, false);
  
  const profile = result;
  profile._id = "profile_" +
   'fbuser' + result.id;
  profile.fbId = profile.id;
  profile.id = undefined;
  profile.type = "profile";

  const user = {
   _id: "org.couchdb.user:" + name,
   name,
   roles: [],
   type: "user",
   password,
   profileId: profile._id
  };

  const event = {
   "_id": `${profile._id}-${Date.now()}-ADD_PROFILE`,
   "createdBy": "Server",
   "status": "draft",
   "action": {
    "type": "ADD_PROFILE",
    "doc": profile
   },
   "preProcessors": [],
   "relevantDocsIds": [profile._id],
   "type": "EVENT",
   "postProcessors": [],
   "createdAt": Date.now()
  }

  if (await profileAlreadyCreated(profile._id)) {
   await insertDoc(usersDb, user);
   res.json({name, password, profileId: profile._id});
  } else {
   await Promise.all([
    insertDoc(mainDb, event),
    insertDoc(usersDb, user)
   ]);
   res.json({name, password, profileId: profile._id, event});
  }
 } catch (e) {
  console.log(e);
  res.json(e);
 }
});

app.listen(3000, function() {
 console.log('Auth app listening on port 3000!')
})
