const bagelbrands = require("./_general");

module.exports = {
	"defaultAttributes": {
		"brand:wikidata": "Q64517373",
		"brand": "Noah's NY Bagels"
	},
	...bagelbrands({
		"initialURL": "https://locations.noahs.com/us"
	})
};
