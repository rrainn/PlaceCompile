const SchemaOrgStoreParser = require("../code/utils/SchemaOrgStoreParser");

const initialURL = "https://www.walgreens.com/Store-Details.xml";

const parserSettings = {
	"type": "xml"
};

module.exports = {
	"defaultAttributes": {
		"brand:wikidata": "Q1591889",
		"brand": "Walgreens"
	},
	initialURL,
	"parser": parserSettings,
	"download": async function (data) {
		const storeURLs = data.urlset.url.map((url) => url.loc);

		return Promise.all(storeURLs.map(async (storeURL) => {
			const fetchResponse = await this.fetch(storeURL);
			const pageData = this.parse(fetchResponse, {"type": "html"});
			const storeDetailJSON = JSON.parse(pageData("script#jsonLD").html());
			return {...storeDetailJSON, "url": storeURL};
		}));
	},
	"parse": function (data) {
		return data.filter((store) => store.geo.latitude && store.geo.longitude).map(SchemaOrgStoreParser).filter(Boolean);
	}
};
