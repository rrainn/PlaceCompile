const fs = require("fs").promises;
const path = require("path");

module.exports = async () => {
	let array = [];
	const spidersContents = (await fs.readdir(path.join(__dirname, "..", "..", "..", "spiders")));

	for (let i = 0; i < spidersContents.length; i++) {
		const spider = spidersContents[i];
		const isDirectory = (await fs.stat(path.join(__dirname, "..", "..", "..", "spiders", spider))).isDirectory();

		if (!isDirectory) {
			array.push(spider);
		} else if (spider !== ".disabled") {
			const directoryContents = (await fs.readdir(path.join(__dirname, "..", "..", "..", "spiders", spider)));
			array.push(...directoryContents.map((file) => `${spider}/${file}`));
		}
	}

	return array.filter((file) => file.endsWith(".js") && !file.split("/").pop().startsWith("_")).sort().map((file) => file.replace(".js", ""));
};
