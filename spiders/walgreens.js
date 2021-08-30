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
		let stores = [];

		const storeURLs = data.urlset.url.map((url) => url.loc);

		await Promise.all(storeURLs.map(async (storeURL) => {
			const fetchResponse = await this.fetch(storeURL);
			const pageData = await this.parse(fetchResponse, {"type": "html"});

			const storeDetailJSON = JSON.parse(pageData("script#jsonLD").html());
			stores.push({...storeDetailJSON, "url": storeURL});
		}));

		return stores;
	},
	"parse": function (data) {
		return data.map((store) => {
			store.openingHoursSpecification = store.openingHoursSpecification.map((openingHoursSpecification) => {
				return {
					...openingHoursSpecification,
					"dayOfWeek": openingHoursSpecification.dayOfWeek.split(" ")[0]
				};
			});
			store["@id"] = store["@id"].match(/id=(.*)/mu)[1];

			return store;
		}).filter((store) => store.geo.latitude && store.geo.longitude).map(SchemaOrgStoreParser);
	}
};
