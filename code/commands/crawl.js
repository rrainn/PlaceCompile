// export GLOBAL_AGENT_HTTP_PROXY=http://127.0.01:9090
// require("global-agent/bootstrap");

const http = require("http");
const https = require("https");
const httpAgent = new http.Agent({ "keepAlive": true });
const httpsAgent = new https.Agent({ "keepAlive": true });
const axiosPkg = require("axios");
const axios = axiosPkg.create({
	httpAgent,
	httpsAgent,
	"headers": {
		"Connection": "keep-alive"
	}
});
const xmlParser = require("fast-xml-parser");
const fs = require("fs").promises;
const path = require("path");
const papaparse = require("papaparse");
const cheerio = require("cheerio");
const timeout = require("../utils/timeout");
const uuid = require("uuid").v4;

module.exports = async (spider, options) => {
	if (spider) {
		await runSpider(spider, options);
	} else {
		const files = await require("./spiders/list")();

		for (let i = 0; i < files.length; i++) {
			const spider = files[i];
			await runSpider(spider.split("/").pop(), options);
		}
	}
};

async function runSpider(name, options) {
	const output = await crawl(name, options);

	switch (options.output) {
	case "file":
		await fs.writeFile(path.join(__dirname, "..", "..", "data", `${name}.${options.format}`), output);
		break;
	case "console":
		console.log(`${name}\n\n${output}\n\n\n\n`);
		break;
	default:
		console.error(`${options.output} output type is invalid.`);
		process.exit(1);
	}
}

const retryFetchCount = 5;
const retryDelay = (count) => ((count - 1) * 1000) + 5000;
async function fetchSingle(url, uuid, settings) {
	// This function cleans up thee url from the currently fetching list, and runs the next item in the queue.
	async function next() {
		currentlyFetchingUUIDs.delete(uuid);
		checkNextPendingFetch();
	}

	async function run(count = 1) {
		try {
			const {data} = await axios(url);

			if (settings && settings.validate) {
				const isValid = await settings.validate(data);
				if (!isValid) {
					throw new Error(`Data is not valid for URL: ${url}`);
				}
			}

			next();
			return data;
		} catch (error) {
			const newCount = count + 1;
			if (count <= retryFetchCount) {
				await timeout(retryDelay(count));
				return run(newCount);
			} else {
				next();
				throw error;
			}
		}
	}

	return run();
}
const maxConcurrentFetch = 10;
const currentlyFetchingUUIDs = new Set();
const pendingFetchRequests = [];
function fetch(url, settings) {
	const fetchUUID = uuid();

	if (currentlyFetchingUUIDs.size >= maxConcurrentFetch) {
		return new Promise((resolve, reject) => {
			pendingFetchRequests.push({
				url,
				settings,
				"uuid": fetchUUID,
				resolve,
				reject
			});
		});
	} else {
		currentlyFetchingUUIDs.add(fetchUUID);
		return fetchSingle(url, fetchUUID, settings);
	}
}
async function checkNextPendingFetch() {
	if (currentlyFetchingUUIDs.size < maxConcurrentFetch) {
		const request = pendingFetchRequests.shift();

		if (request) {
			currentlyFetchingUUIDs.add(request.uuid);

			try {
				const result = await fetchSingle(request.url, request.uuid, request.settings);
				request.resolve(result);
			} catch (error) {
				request.reject(error);
			}
		}
	}
}
function parse(pageData, settings) {
	const parserType = typeof settings === "object" ? settings.type : settings;
	const parserSettings = typeof settings === "object" ? settings.settings : undefined;

	let data;
	switch (parserType) {
	case "xml":
		data = xmlParser.parse(pageData, parserSettings);
		break;
	case "html":
		data = cheerio.load(pageData);
		break;
	case "json":
		data = pageData;
		break;
	default:
		console.error(`${parserType} parser is not a valid parser.`);
		break;
	}
	return data;
}

async function crawl(name, options) {
	const files = await require("./spiders/list")();
	const spider = require(`../../spiders/${files.find((file) => file.endsWith(name))}`);
	const initialPageData = await fetch(spider.initialURL);

	const data = parse(initialPageData, spider.parser);

	let features = await spider.parse.call({
		fetch,
		parse
	}, data);
	features.forEach((_a, index) => {
		features[index].properties = {
			...spider.defaultAttributes,
			...features[index].properties,
		};
	});
	if (spider.postProcess) {
		features = await spider.postProcess(features);
	}

	features = features.sort((a, b) => {
		if (a.properties.ref && b.properties.ref) {
			return a.properties.ref > b.properties.ref;
		} else if (a.geometry && b.geometry) {
			return a.geometry.coordinates.join("") > b.geometry.coordinates.join("");
		} else {
			return true;
		}
	});

	features = features.map((feature) => {
		const newPropertiesObject = {};
		const propertiesKeys = Object.keys(feature.properties).sort();

		propertiesKeys.forEach((key) => newPropertiesObject[key] = feature.properties[key]);

		feature.properties = newPropertiesObject;

		return feature;
	});

	switch (options.format) {
		case "csv":
			return papaparse.unparse(JSON.stringify(features.map((feature) => ({
				...feature.properties,
				"longitude": feature.geometry[0],
				"latitude": feature.geometry[1]
			}))));
		case "geojson":
			const jsonObject = {
				"type": "FeatureCollection",
				features,
				"updated_at": Date.now()
			};
			return JSON.stringify(jsonObject, null, options.output === "file" ? 4 : 2);
		default:
			console.error(`Invalid format ${options.format}`);
			process.exit(1);
	}
}
