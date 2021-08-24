const bagelbrands = require("./_general");

module.exports = {
	"defaultAttributes": {
		"brand:wikidata": "Q64517333",
		"brand": "Manhattan Bagel"
	},
	...bagelbrands({
		"initialURL": "https://locations.manhattanbagel.com/us"
	})
};
