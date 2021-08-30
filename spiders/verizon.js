const earthutils = require("earthutils");
const openingHoursStringify = require("../code/utils/openingHoursStringify");
const dayofweek = require("../code/utils/dayofweek");
const timeTo24HourTime = require("../code/utils/timeTo24HourTime");
const capitalizefirstletter = require("../code/utils/capitalizefirstletter");

const initialURL = "https://www.verizonwireless.com/sitemap_storelocator.xml";

const parserSettings = {
	"type": "xml"
};

module.exports = {
	"defaultAttributes": {
		"brand:wikidata": "Q919641",
		"brand": "Verizon"
	},
	initialURL,
	"parser": parserSettings,
	"download": async function (data) {
		const storeURLs = data.urlset.url.map((url) => url.loc);

		return Promise.all(storeURLs.map(async (storeURL) => {
			const fetchResponse = await this.fetch(storeURL);
			const pageData = await this.parse(fetchResponse, {"type": "html"});

			const jsonData = [];
			pageData("script").each((_, b) => {
				const data = pageData(b).html();
				if (data.includes("var storeJSON = {")) {
					jsonData.push(data);
				}
			});

			if (jsonData.length !== 1) {
				return null;
			};

			const storeDetailJSON = JSON.parse(/^\s*?var storeJSON = (\{.*?\});$/gmu.exec(jsonData[0])[1]);

			return {...storeDetailJSON, "url": storeURL};
		}));
	},
	"parse": function (data) {
		return data.map((store) => {
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
					"name": store.storeName,
					"ref": `${store.storeNumber}`,
					...earthutils.AddressParser(store.posStoreDetail ? [store.posStoreDetail.address1, store.posStoreDetail.address2].filter(Boolean).join(" ") : store.address.streetAddress, {"standardizeStreet": true}),
					"addr:city": store.address.addressLocality.split(" ").map(capitalizefirstletter).join(" "),
					"addr:postcode": `${store.address.postalCode}`,
					"addr:country": store.address.countryCode,
					"website": store.url
				}
			};

			if (storeObject.properties["addr:country"] === "US") {
				storeObject.properties["addr:state"] = store.address.addressRegion;
			}

			if (store.telephone) {
				const phoneNumber = earthutils.TelephoneStandardize(store.telephone, {"country": storeObject.properties["addr:country"]});
				if (phoneNumber) {
					storeObject.properties.phone = phoneNumber;
				}
			}

			const openingHours = openingHoursStringify(Object.keys(dayofweek.DayOfWeekAbbreviationsInverse).map((dayOfWeek) => {
				// Get first 3 characters of dayOfWeek
				const dayOfWeekAbbreviation = dayOfWeek.substr(0, 3);
				const open = store.StoreHours[dayOfWeekAbbreviation + "Open"];
				const close = store.StoreHours[dayOfWeekAbbreviation + "Close"];
				if (!open || !close || open === "Closed" || close === "Closed") {
					return null;
				} else {
					return [dayOfWeek.toLowerCase(), `${timeTo24HourTime(open)}-${timeTo24HourTime(close)}`];
				}
			}));
			if (openingHours && openingHours.length > 0) {
				storeObject.properties["opening_hours"] = openingHours;
			}

			return storeObject;
		});
	}
};
