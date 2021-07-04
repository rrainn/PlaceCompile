const axios = require("axios");
const xmlParser = require("fast-xml-parser");
const fs = require("fs").promises;
const path = require("path");

module.exports = async (spider, options) => {
	if (spider) {
		await runSpider(spider, options);
	} else {
		const files = (await fs.readdir(path.join(__dirname, "..", "..", "spiders"))).filter((file) => file.endsWith(".js")).map((file) => file.replace(".js", ""));

		for (let i = 0; i < files.length; i++) {
			const spider = files[i];
			await runSpider(spider, options);
		}
	}
};

async function runSpider(name, options) {
	const output = await crawl(name);

	switch (options.output) {
	case "file":
		await fs.writeFile(path.join(__dirname, "..", "..", "data", `${name}.geojson`), JSON.stringify(output, null, 4));
		break;
	case "console":
		console.log(`${name}\n\n${JSON.stringify(output, null, 2)}\n\n\n\n`);
		break;
	default:
		console.error(`${output} output type is invalid.`);
		process.exit(1);
	}
}

async function crawl(name) {
	const spider = require(`../../spiders/${name}`);
	const initialPageData = (await axios(spider.initialURL)).data;

	const parserType = typeof spider.parser === "object" ? spider.parser.type : spider.parser;
	const parserSettings = typeof spider.parser === "object" ? spider.parser.settings : undefined;

	let data;
	switch (parserType) {
	case "xml":
		data = xmlParser.parse(initialPageData, parserSettings);
		break;
	default:
		console.error(`${spider.parser} parser is not a valid parser.`);
		break;
	}

	const features = await spider.parse(data);
	features.forEach((_a, index) => {
		features[index].properties = {
			...spider.defaultAttributes,
			...features[index].properties,
		};
	});

	return {
		"type": "FeatureCollection",
		features,
		"updated_at": Date.now()
	};
}
