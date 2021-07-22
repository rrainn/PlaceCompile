const fs = require("fs").promises;
const path = require("path");
const turf = require("@turf/turf");

module.exports = async (spider, options) => {
	let metadata;
	if (!spider) {
		const files = (await fs.readdir(path.join(__dirname, "..", "..", "data"))).filter((file) => file.endsWith(".geojson")).sort();
		metadata = await Promise.all(files.map((file) => generateSingleMetadata(file)));
	} else {
		metadata = [await generateSingleMetadata(`${spider}.geojson`)];
	}

	switch (options.output) {
	case "file":
		await Promise.all(metadata.map(async (metadataObj) => {
			await fs.writeFile(path.join(__dirname, "..", "..", "data", `${metadataObj.spider}.metadata.json`), JSON.stringify(metadataObj, null, 4));
		}));
		break;
	case "console":
		console.log(JSON.stringify(metadata, null, 2));
		break;
	default:
		console.error(`${options.output} output type is invalid.`);
		process.exit(1);
	}
};

async function generateSingleMetadata(file) {
	// Read the file
	const fileString = await fs.readFile(path.join(__dirname, "..", "..", "data", file), "utf8");
	// Parse the file
	const data = JSON.parse(fileString);
	// Determine how many features are in the file
	const featureCount = data.features.length;
	// Get array of all property object keys
	const properties = data.features.reduce((acc, feature) => {
		acc.push(...Object.keys(feature.properties));
		return acc;
	}, []);
	// Get all unique properties
	const uniqueProperties = [...new Set(properties)];
	// Get list of all geometry types
	const geometryTypes = data.features.map((feature) => feature.geometry.type);
	// Get all unique geometry types
	const uniqueGeometryTypes = [...new Set(geometryTypes)];
	// Generate bounding box for all features
	const bbox = turf.bbox(data);
	const bboxPolygon = turf.bboxPolygon(bbox);
	delete bboxPolygon.bbox;

	return {
		"spider": file.replace(".geojson", ""),
		"features": featureCount,
		"properties": uniqueProperties,
		"geometryTypes": uniqueGeometryTypes,
		"boundingBoxGeoJSON": bboxPolygon,
		"boundingBox": bbox,
		"dataUpdatedAt": data.updated_at
	};
}
