const fs = require("fs").promises;
const path = require("path");

module.exports = async () => {
	const files = (await fs.readdir(path.join(__dirname, "..", "..", "..", "spiders"))).filter((file) => file.endsWith(".js")).sort().map((file) => file.replace(".js", ""));

	return files;
};
