const bagelbrands = require("./_general");

module.exports = {
	"defaultAttributes": {
		"brand:wikidata": "Q5349788",
		"brand": "Einstein Bros. Bagels"
	},
	...bagelbrands({
		"initialURL": "https://locations.einsteinbros.com/us",
		"urlModifier": {
			"https://locations.einsteinbros.com/us/wa/fort-lewis/n-12th-&amp;-pendleton-ave": "https://locations.einsteinbros.com/us/wa/fort-lewis/n-12th-&-pendleton-ave"
		}
	})
};
