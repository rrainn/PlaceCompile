// export GLOBAL_AGENT_HTTP_PROXY=http://127.0.01:9090
require("global-agent/bootstrap");

const axios = require("axios");
const xmlParser = require("fast-xml-parser");
const fs = require("fs").promises;
const path = require("path");
const papaparse = require("papaparse");
const cheerio = require("cheerio");
const timeout = require("../utils/timeout");

module.exports = async (spider, options) => {
	if (spider) {
		await runSpider(spider, options);
	} else {
		const files = await require("./spiders/list")();

		for (let i = 0; i < files.length; i++) {
			const spider = files[i];
			await runSpider(spider, options);
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
async function fetch(url, settings) {
	async function run(count = 1) {
		try {
			const {data} = await axios(url);

			if (settings && settings.validate) {
				const isValid = await settings.validate(data);
				if (!isValid) {
					throw new Error("Data is not valid");
				}
			}

			return data;
		} catch (error) {
			const newCount = count + 1;
			if (newCount >= retryFetchCount) {
				await timeout(retryDelay(count));
				return run(newCount);
			} else {
				throw error;
			}
		}
	}

	return run();
}

async function crawl(name, options) {
	const spider = require(`../../spiders/${name}`);
	const initialPageData = await fetch(spider.initialURL);

	const parserType = typeof spider.parser === "object" ? spider.parser.type : spider.parser;
	const parserSettings = typeof spider.parser === "object" ? spider.parser.settings : undefined;

	let data;
	switch (parserType) {
	case "xml":
		data = xmlParser.parse(initialPageData, parserSettings);
		break;
	case "html":
		data = cheerio.load(initialPageData);
		break;
	default:
		console.error(`${spider.parser} parser is not a valid parser.`);
		break;
	}

	let features = await spider.parse.call({
		fetch
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
