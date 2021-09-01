const os = require("os");
const path = require("path");
const fs = require("fs").promises;
const fileExists = require("../../utils/fileExists");

module.exports = async (spider) => {
	const tmpFolder = require("./location")();

	async function deleteFunc(spider) {
		const file = (await fs.readdir(tmpFolder)).find((file) => file.startsWith(spider));
		const cachedFile = path.join(tmpFolder, file);

		// Remove cached file
		if (await fileExists(cachedFile)) {
			const isDirectory = (await fs.stat(cachedFile)).isDirectory();

			if (isDirectory) {
				await fs.rm(cachedFile, {"recursive": true});
			} else {
				await fs.unlink(cachedFile);
			}
		}
	}
	if (spider) {
		await deleteFunc(spider);
	} else {
		const files = await require("../spiders/list")();

		await Promise.all(files.map(deleteFunc));
	}
};
