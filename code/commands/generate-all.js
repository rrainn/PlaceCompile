const fs = require("fs").promises;
const path = require("path");

module.exports = async () => {
	const files = (await fs.readdir(path.join(__dirname, "..", "..", "data"))).filter((file) => file.endsWith(".geojson") && !file.startsWith("_")).sort();
	const features = await Promise.all(files.map(async (file) => {
		const string = await fs.readFile(path.join(__dirname, "..", "..", "data", file), "utf8");
		const data = JSON.parse(string);
		return data.features;
	}));

	const jsonObject = {
		"type": "FeatureCollection",
		features
	};
	const jsonString = JSON.stringify(jsonObject, null, 4);

	await fs.writeFile(path.join(__dirname, "..", "..", "data", "_all.geojson"), jsonString);
};
