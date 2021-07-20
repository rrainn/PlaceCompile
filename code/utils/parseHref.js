const url = require("url");

const escapedCharacters = {
	"–": "%E2%80%93",
	"’": "%E2%80%99",
	"ø": "%C3%B8",
	"©": "%C2%A9",
	"¨": "%C2%A8",
	"ß": "%C3%9F",
	"½": "%C2%BD"
};

module.exports = function (href, baseURLString) {
	if (href == null || baseURLString == null) {
		return null;
	}

	href = href.replace(/^\/\//, "https://").replace(/#.*$/, "");
	baseURLString = baseURLString.replace(/^\/\//, "https://").replace(/#.*$/, "");

	let parsedUrl = url.parse(href);
	delete parsedUrl.hash;

	if (parsedUrl.protocol && parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
		return null;
	}

	if (parsedUrl.host == null) {
		const parsedBaseUrl = url.parse(baseURLString);
		delete parsedBaseUrl.hash;

		const absoluteUrl = url.parse(url.resolve(parsedBaseUrl, parsedUrl));
		href = url.format(absoluteUrl);
	}

	parsedUrl = url.parse(href);
	delete parsedUrl.hash;

	let returnString = url.format(parsedUrl);
	Object.entries(escapedCharacters).forEach(([key, value]) => {
		returnString = returnString.replaceAll(key, value);
	});
	return returnString;
};
