const fs = require("fs").promises;
const path = require("path");

module.exports = async () => {
	const files = (await fs.readdir(path.join(__dirname, "..", "..", "data"))).filter((file) => file.endsWith(".geojson") && !file.startsWith("_")).sort();

	let primarySuccess = true;

	for (const file of files) {
		const string = await fs.readFile(path.join(__dirname, "..", "..", "data", file), "utf8");
		const data = JSON.parse(string);
		const spider = file.replace(".geojson", "");
		const success = lint(data, spider);
		if (!success) {
			primarySuccess = false;
		}
	}

	if (!primarySuccess) {
		process.exit(1);
	}
};

function lint(data, spider) {
	let success = true;
	data.features.forEach((feature) => {
		if (feature.geometry.type !== "Point") {
			console.error(`${spider}: ${feature.properties.ref} is not a point`);
		}
		if (!feature.geometry.coordinates.every((coordinate) => typeof coordinate === "number")) {
			console.error(`${spider}: ${feature.properties.ref} has coordinates are not all numbers`);
		}
		if (feature.geometry.coordinates.length !== 2) {
			console.error(`${spider}: ${feature.properties.ref} has more than 2 coordinates`);
		}
		if (feature.geometry.coordinates[0] < -180 || feature.geometry.coordinates[0] > 180) {
			console.error(`${spider}: ${feature.properties.ref} has invalid longitude`);
		}
		if (feature.geometry.coordinates[1] < -90 || feature.geometry.coordinates[1] > 90) {
			console.error(`${spider}: ${feature.properties.ref} has invalid latitude`);
		}
		if (feature.geometry.coordinates[0] === feature.geometry.coordinates[1]) {
			console.error(`${spider}: ${feature.properties.ref} coordinates are identical`);
		}

		Object.entries(feature.properties).forEach(([key, value]) => {
			if (value === "") {
				console.error(`${spider}: ${feature.properties.ref} has empty string for property ${key}`);
			}
			if (value === undefined) {
				console.error(`${spider}: ${feature.properties.ref} has undefined for property ${key}`);
			}
			if (value === null) {
				console.error(`${spider}: ${feature.properties.ref} has null for property ${key}`);
			}
			if (typeof value === "string" && value.includes("undefined")) {
				console.error(`${spider}: ${feature.properties.ref} has undefined in string for property ${key}`);
			}
		});
	});

	return success;
}
