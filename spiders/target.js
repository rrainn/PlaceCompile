const earthutils = require("earthutils");
const SchemaOrgStoreParser = require("../code/utils/SchemaOrgStoreParser");

// https://www.target.com/sitemap_index.xml.gz
// sl stands for store location
const initialURL = "https://www.target.com/sl/sitemap_001.xml.gz";

const parserSettings = {
	"type": "xml"
};

module.exports = {
	"defaultAttributes": {
		"brand:wikidata": "Q1046951",
		"brand": "Target"
	},
	initialURL,
	"parser": parserSettings,
	"parse": async function (data) {
		let stores = [];

		const storeURLs = data.urlset.url.map((url) => url.loc);

		for (let i = 0; i < storeURLs.length; i++) {
			const storeURL = storeURLs[i];
			const fetchResponse = await this.fetch(storeURL);
			const pageData = await this.parse(fetchResponse, {"type": "html"});
			const storeDetailJSON = JSON.parse(pageData("script[type=application/ld+json]").html().replaceAll("&quot;", "\""));
			stores.push({...storeDetailJSON, "url": storeURL});
		}

		return stores.map((store) => {
			store.address.addressCountry = earthutils.CountryAbbreviations.CountryAbbreviations[store.address.addressCountry];

			return store;
		}).map(SchemaOrgStoreParser);
	}
};
