const earthutils = require("earthutils");
const OpeningHoursSpecificationParser = require("../code/utils/OpeningHoursSpecificationParser");


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
			const storeObject = {
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [
						store.geo.longitude,
						store.geo.latitude
					]
				},
				"properties": {
					"name": store.name,
					"ref": store["@id"],
					...earthutils.AddressParser(store.address.streetAddress, {"standardizeStreet": true}),
					"addr:city": store.address.addressLocality,
					"addr:postcode": `${store.address.postalCode}`,
					"website": store.url
				}
			};

			const countryAbbrevation = earthutils.CountryAbbreviations.CountryAbbreviations[store.address.addressCountry];
			if (countryAbbrevation) {
				storeObject.properties["addr:country"] = countryAbbrevation;
			}

			if (storeObject.properties["addr:country"] === "US") {
				storeObject.properties["addr:state"] = store.address.addressRegion;
			}

			const phoneNumber = earthutils.TelephoneStandardize(store.telephone, {"country": storeObject.properties["addr:country"]});
			if (phoneNumber) {
				storeObject.properties["phone"] = phoneNumber;
			}

			const openingHours = OpeningHoursSpecificationParser(store.openingHoursSpecification);
			if (openingHours.length > 0) {
				storeObject.properties["opening_hours"] = openingHours;
			}

			return storeObject;
		});
	}
};
