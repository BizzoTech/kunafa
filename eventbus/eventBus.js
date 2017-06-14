const {mainDb, archiveDb, runFor} = require('experimental-server');

const R = require('ramda');

const getEvents = async() => {
	const result = await mainDb.find({
		selector: {
			type: "EVENT",
			status: {
				"$ne": "error"
			},
			"$or": [
        {
					"info.bundle_id": "com.wasafat"
				}, {
					"info.bundle_id": "com.bizzotech.babrika"
				}, {
					createdBy: "Server"
				}
			]
		},
		sort: [
			{
				createdAt: "asc"
			}
		]
	});
	return result.docs;
}

const handleEvent = async (event) => {
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
		// case "done":
		// 	return await mainDb.put(R.merge(event, {status: "archived"}));
    case "archived":
      return await mainDb.put(R.merge(event, {_deleted: true}));
		default:
			return;
	}
}


const getArchiveEvents = async() => {
	const result = await archiveDb.find({
		selector: {
			type: "EVENT",
			status: "done",
		}
	});
	return result.docs;
}


const start = async() => {
  const events = await getEvents();
  console.log("Events " + events.length);
  for (event of events) {
    await handleEvent(event);
  }
  const archivedEvents = await getArchiveEvents();
  console.log("Archive Events " + archivedEvents.length);
  await archiveDb.bulkDocs(archivedEvents.map(event => {
    return R.merge(event, {status: "archived"});
  }));
}

runFor(start, 1000 * 60 * 15, "Event Bus");
