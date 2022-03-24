const earthutils = require("earthutils");
const parseHref = require("../code/utils/parseHref");
const DayIntervalsArrayOpeningHoursParser = require("../code/utils/DayIntervalsArrayOpeningHoursParser");

const initialURL = "https://restaurants.subway.com/";
const parserSettings = {
	"type": "html"
};

module.exports = {
	"defaultAttributes": {
		"brand:wikidata": "Q244457",
		"brand": "Subway"
	},
	initialURL,
	"parser": parserSettings,
	"download": async function (data) {
		let stores = [];
		const self = this;

		const urlsToCrawl = [];
		do {
			let urlString;
			if (!data) {
				urlString = urlsToCrawl.shift();
				let fetchResponse;
				try {
					fetchResponse = await self.fetch(urlString);
				} catch (error) {
					if (error && error.response && error.response.status === 404) {
						console.error(`404 error on ${urlString}`);
						continue;
					} else {
						throw error;
					}
				}
				data = await self.parse(fetchResponse, parserSettings);
			} else {
				urlString = initialURL;
			}

			const linksArray = data(".Directory-listLinks .Directory-listItem:not(.is-hidden) a,.Directory-listTeasers a").toArray();

			if (linksArray.length === 0) {
				let storeDetailJSON = JSON.parse(data("script.js-hours-config").html()) || JSON.parse(data("script.js-map-config").html()).entities[0];
				storeDetailJSON.url = urlString;
				stores.push(storeDetailJSON);
			} else {
				for (const element of linksArray) {
					const href = data(element).attr("href");

					const newURL = parseHref(href, urlString);
					urlsToCrawl.push(newURL);
				}
			}

			data = null;
		} while (urlsToCrawl.length > 0);

		return stores;
	},
	"parse": function (data) {
		return data.map((store) => {
			const storeObject = {
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [
						store.profile.yextDisplayCoordinate.long,
						store.profile.yextDisplayCoordinate.lat
					]
				},
				"properties": {
					"name": ["Subway", store.profile.geomodifier].filter((a) => !!a).join(" "),
					"ref": `${store.profile.meta.id || ""}`,
					...earthutils.AddressParser(store.profile.address.line1, {"standardizeStreet": true}),
					"addr:city": store.profile.address.city,
					"addr:postcode": `${store.profile.address.postalCode}`,
					"addr:country": store.profile.address.countryCode,
					"website": store.url
				}
			};

			if (storeObject.properties["addr:country"] === "US") {
				storeObject.properties["addr:state"] = store.profile.address.region;
			}

			if (store.profile.mainPhone) {
				const phoneNumber = earthutils.TelephoneStandardize(store.profile.mainPhone.number, {"country": store.profile.mainPhone.countryCode});
				if (phoneNumber) {
					storeObject.properties.phone = phoneNumber;
				}
			}

			const openingHours = DayIntervalsArrayOpeningHoursParser((store.profile.hours || store.hours)?.normalHours);
			if (openingHours && openingHours.length > 0) {
				storeObject.properties["opening_hours"] = openingHours;
			}

			return storeObject;
		});
	}
};
