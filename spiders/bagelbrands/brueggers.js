const bagelbrands = require("./_general");

module.exports = {
	"defaultAttributes": {
		"brand:wikidata": "Q4978656",
		"brand": "Bruegger's Bagels"
	},
	...bagelbrands({
		"initialURL": "https://locations.brueggers.com/us"
	})
};
