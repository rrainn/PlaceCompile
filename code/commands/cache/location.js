const path = require("path");
const os = require("os");

module.exports = () => {
	return path.join(os.tmpdir(), "placecompile", "crawl", "download", "cache");
};
