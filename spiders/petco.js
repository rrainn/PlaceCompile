const earthutils = require("earthutils");
const { DayOfWeekAbbreviations } = require("../code/utils/dayofweek");
const parseHref = require("../code/utils/parseHref");
const DayIntervalsArrayOpeningHoursParser = require("../code/utils/DayIntervalsArrayOpeningHoursParser");

const initialURL = "https://stores.petco.com/";
const parserSettings = {
	"type": "html"
};

module.exports = {
	"defaultAttributes": {
		"brand:wikidata": "Q7171798",
		"brand": "Petco"
	},
	initialURL,
	"parser": parserSettings,
	"download": async function (data) {
		let stores = [];
		const self = this;

		async function parsePage(pageData, urlString, depth = 0) {
			// 0 = worldwide
			// 1 = state
			// 2 = city
			// 3 = store
			if (depth < 3) {
				const linksArray = [...new Set(pageData("a[data-gaq=\"List, Region\"],a[data-gaq=\"List, City\"],a.gaq-link[data-gaq=\"List, Location\"]").toArray().map((item) => pageData(item).attr("href")))];
				const newDepth = ++depth;
				for (let i = 0; i < linksArray.length; i++) {
					const href = linksArray[i];

					const newURL = parseHref(href, urlString);

					const fetchResponse = await self.fetch(newURL);
					const fetchParsed = await self.parse(fetchResponse, parserSettings);
					await parsePage(fetchParsed, newURL, newDepth);
				}
			} else {
				const json = JSON.parse(pageData("script[type='application/ld+json']").html())[0];
				stores.push({...json, "url": urlString});
			}
		}
		await parsePage(data, initialURL);

		return stores;
	},
	"parse": function (data) {
		return data.map((store) => {
			const storeObject = {
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [
						parseFloat(store.geo.longitude),
						parseFloat(store.geo.latitude)
					]
				},
				"properties": {
					"name": "Petco",
					"ref": store.url.replaceAll("https://stores.petco.com/", "").replaceAll(".html", ""),
					...earthutils.AddressParser(store.address.streetAddress, {"standardizeStreet": true}),
					"addr:city": store.address.addressLocality,
					"addr:postcode": `${store.address.postalCode}`.trim(),
					"addr:country": "US",
					"website": store.url
				}
			};

			if (storeObject.properties["addr:country"] === "US") {
				storeObject.properties["addr:state"] = store.address.addressRegion;
			}

			const phoneNumber = earthutils.TelephoneStandardize(store.telephone, {"country": storeObject.properties["addr:country"]});
			if (phoneNumber) {
				storeObject.properties.phone = phoneNumber;
			}

			const regex = /(..) (\d\d:\d\d) - (\d\d:\d\d)/gmu;
			let hours = [];
			let match;
			do {
				match = regex.exec(store.openingHours);
				if (match) {
					hours.push({
						"day": DayOfWeekAbbreviations[match[1]],
						"intervals": [
							{
								"start": parseInt(match[2].replace(":", "")),
								"end": parseInt(match[3].replace(":", ""))
							}
						]
					});
				}
			} while (match);
			const openingHours = DayIntervalsArrayOpeningHoursParser(hours);
			if (openingHours && openingHours.length > 0) {
				storeObject.properties["opening_hours"] = openingHours;
			}

			return storeObject;
		});
	}
};
