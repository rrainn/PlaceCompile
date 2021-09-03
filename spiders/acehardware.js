const earthutils = require("earthutils");
const dayofweek = require("../code/utils/dayofweek");
const cheerio = require("cheerio");
const openingHoursStringify = require("../code/utils/openingHoursStringify");

module.exports = {
	"defaultAttributes": {
		"brand:wikidata": "Q4672981",
		"brand": "Ace Hardware"
	},
	"initialURL": "https://www.acehardware.com/store-directory",
	"parser": {
		"type": "html"
	},
	"download": function (data) {
		data = JSON.parse(data("#data-mz-preload-storeDirectory").html());

		const self = this;
		return Promise.all(data.map(async (store) => {
			const storeDetailData = await self.fetch(`https://www.acehardware.com/store-details/${store.code}`, {
				"validate": (data) => data.includes("data-mz-preload-store")
			});
			const storeHTML = await self.parse(storeDetailData, {"type": "html"});
			const storeDetailJSON = JSON.parse(storeHTML("#data-mz-preload-store").html());
			return {
				store,
				storeDetailJSON
			};
		}));
	},
	"parse": function (data) {
		return data.map((obj) => {
			const {store, storeDetailJSON} = obj;

			const storeObject = {
				"type": "Feature",
				"geometry": {},
				"properties": {
					"name": store.name,
					"ref": `${store.code}`,
					...earthutils.AddressParser([store.address.address1, store.address.address2, store.address.address3, store.address.address4].filter((val) => val.length > 0).join(" ").trim(), {"standardizeStreet": true}),
					"addr:city": store.address.cityOrTown,
					"addr:state": store.address.stateOrProvince,
					"addr:postcode": `${store.address.postalOrZipCode}`,
					"addr:country": store.address.countryCode,
					"website": `https://www.acehardware.com/store-details/${store.code}`
				}
			};

			if (storeDetailJSON && storeDetailJSON.Longitude && storeDetailJSON.Latitude) {
				storeObject.geometry = {
					"type": "Point",
					"coordinates": [
						parseFloat(storeDetailJSON.Longitude),
						parseFloat(storeDetailJSON.Latitude)
					]
				};
			} else {
				delete storeObject.geometry;
			}

			const phoneNumber = earthutils.TelephoneStandardize(store.phone, {"country": storeObject.properties["addr:country"]});
			if (phoneNumber) {
				storeObject.properties.phone = phoneNumber;
			}

			const openingHours = openingHoursStringify(Object.keys(dayofweek.DayOfWeekAbbreviationsInverse).map((dayOfWeek) => dayOfWeek.toLowerCase()).map((dayOfWeek) => {
				if (store.regularHours[dayOfWeek].isClosed || !store.regularHours[dayOfWeek].openTime || !store.regularHours[dayOfWeek].closeTime) {
					return null;
				} else {
					return [dayOfWeek, `${store.regularHours[dayOfWeek].openTime}-${store.regularHours[dayOfWeek].closeTime}`];
				}
			}));
			if (openingHours && openingHours.length > 0) {
				storeObject.properties["opening_hours"] = openingHours;
			}

			return storeObject;
		}));
	}
};
