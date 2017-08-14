const {mainDb, archiveDb, runFor} = require('experimental-server');

const R = require('ramda');

const getEvents = async() => {
 const result = await mainDb.find({
  selector: {
   type: "EVENT",
   status: {
    "$nin": ["error"]
   }
  },
  limit: 100,
  sort: [
   {
    createdAt: "asc"
   }
  ]
 });
 return result.docs;
}

const handleEvent = async(event) => {
 switch (event.status) {
  case "draft":
   if (event.preProcessors && event.preProcessors.length > 0) {
    return await mainDb.put(R.merge(event, {
     status: "preProcessing",
     preProcessor: event.preProcessors[0].name
    }));
   } else {
    return await mainDb.put(R.merge(event, {status: "processing"}));
   }
   break;
  case "preProcessing":
   const currentPreProcessor = event.preProcessors.find(p => p.name === event.preProcessor);
   if (currentPreProcessor.status !== "done") {
    return;
   }
   const currentPreProcessorIndex = event.preProcessors.indexOf(currentPreProcessor);
   if ((currentPreProcessorIndex + 1) < event.preProcessors.length) {
    return await mainDb.put(R.merge(event, {
     preProcessor: event.preProcessors[currentPreProcessorIndex + 1].name
    }));
   } else {
    return await mainDb.put(R.merge(event, {
     status: "processing",
     preProcessor: undefined
    }));
   }
   break;
  case "processing":
   const isAppliedOnAllRelevantDocs = event.relevantDocsIds.every(docId => {
    return event.appliedOn && !!event.appliedOn[docId];
   });
   if (isAppliedOnAllRelevantDocs) {
    if (event.postProcessors && event.postProcessors.length > 0) {
     return await mainDb.put(R.merge(event, {
      status: "postProcessing",
      postProcessor: event.postProcessors[0].name
     }));
    } else {
     return await mainDb.put(R.merge(event, {status: "done"}));
    }
   }
   break;
  case 'postProcessing':
   const currentPostProcessor = event.postProcessors.find(p => p.name === event.postProcessor);
   if (currentPostProcessor.status !== "done") {
    return;
   }
   const currentPostProcessorIndex = event.postProcessors.indexOf(currentPostProcessor);
   if ((currentPostProcessorIndex + 1) < event.postProcessors.length) {
    return await mainDb.put(R.merge(event, {
     postProcessor: event.postProcessors[currentPostProcessorIndex + 1].name
    }));
   } else {
    return await mainDb.put(R.merge(event, {
     status: "done",
     postProcessor: undefined
    }));
   }
   break;
  case 'done':
    if(checkToArchive(event)){
      return await mainDb.put(R.merge(event, {status: "archived"}));
    }
  case "archived":
  try {
    const doc = await archiveDb.get(event._id);
    if(doc){
      return await mainDb.put(R.merge(event, {status: "deleted", _deleted: true}));
    }
  } catch (e) {

  }
  default:
   return;
 }
}

const checkToArchive = event => {
  if(!event.relevantDocsIds || event.relevantDocsIds.length === 0){
    return true;
  }
  return event.appliedOn && event.appliedOnClient && Object.keys(event.appliedOn).every(docId => event.appliedOnClient[docId]);
}

const start = async() => {
 const events = await getEvents();
 console.log("Events " + events.length);
 for (event of events) {
  await handleEvent(event);
 }
}

runFor(start, 1000 * 60 * 15, "Event Bus");
