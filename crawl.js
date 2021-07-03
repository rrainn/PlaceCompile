const axios = require("axios");
const xmlParser = require("fast-xml-parser");
const fs = require("fs").promises;
const path = require("path");

const args = process.argv;
const [,,spider] = args;

(async () => {
	if (spider) {
		const output = await crawl(spider);

		await fs.writeFile(path.join(__dirname, "data", `${spider}.geojson`), JSON.stringify(output, null, 4));
	} else {
		console.error("Running all crawlers is not supported yet.")
		process.exit(1);
	}
})();

async function crawl(name) {
	const spider = require(`./spiders/${name}.js`);
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

	const output = await spider.parse(data);

	output.features.forEach((_a, index) => {
		output.features[index].properties = {
			...spider.defaultAttributes,
			...output.features[index].properties,
		};
	});
	output["updated_at"] = Date.now();

	return output;
}
