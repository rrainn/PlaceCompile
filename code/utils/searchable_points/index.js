const fs = require("fs").promises;
const path = require("path");
const turf = require("@turf/turf");

// Returns an array of GeoJSON feature's (not wrapped within FeatureCollection). Each feature is a point.
module.exports = async (countryCode, mileRadius) => {
	const file = await fs.readFile(path.join(__dirname, `${countryCode}.geojson`), "utf8");
	const data = JSON.parse(file);

	const result = data.features[0].geometry.coordinates.reduce((acc, item) => {
		const polygon = turf.polygon(item);
		const bbox = turf.bbox(polygon);

		const cellSide = mileRadius / 2;
		const options = {"units": "miles"};

		/// TODO: Consider changing this to pointGrid
		const hexgrid = turf.hexGrid(bbox, cellSide, options);
		hexgrid.features = hexgrid.features.filter((feature) => {
			// Check if feature overlaps with polygon
			return turf.booleanIntersects(feature, polygon);
		});

		acc.push(...hexgrid.features);
		return acc;
	}, []).map((feature) => turf.centerOfMass(feature));

	return result;
};
