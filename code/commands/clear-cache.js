const os = require("os");
const path = require("path");
const fs = require("fs").promises;
const fileExists = require("../utils/fileExists");

module.exports = async (spider) => {
	const tmpFolder = path.join(os.tmpdir(), "placecompile", "crawl", "download", "cache");

	async function deleteFunc(spider) {
		const cachedFile = path.join(tmpFolder, `${spider}.json`);

		// Remove cached file
		if (await fileExists(cachedFile)) {
			await fs.unlink(cachedFile);
		}
	}
	if (spider) {
		await deleteFunc(spider);
	} else {
		const files = await require("./spiders/list")();

		await Promise.all(files.map(deleteFunc));
	}
};
