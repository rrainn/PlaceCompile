const earthutils = require("earthutils");
const dayofweek = require("../code/utils/dayofweek");
const openingHoursStringify = require("../code/utils/openingHoursStringify");
const timeTo24HourTime = require("../code/utils/timeTo24HourTime");

module.exports = {
	"defaultAttributes": {
		"brand:wikidata": "Q483915",
		"brand": "Nike"
	},
	"initialURL": "https://nike.brickworksoftware.com/api/v3/stores.json",
	"parser": {
		"type": "json"
	},
	"parse": function (data) {
		return data.stores.map((store) => {
			let address = earthutils.AddressParser(store.address_2 || store.address_1, {"standardizeStreet": true});
			if (!address["addr:housenumber"]) {
				address = earthutils.AddressParser([store.address_1, store.address_2].join(" "), {"standardizeStreet": true});
			}
			const storeObject = {
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [
						store.longitude,
						store.latitude
					]
				},
				"properties": {
					"name": store.name,
					"ref": `${store.id}`,
					...address,
					"addr:city": store.city,
					"addr:postcode": store.postal_code,
					"addr:state": store.state,
					"addr:country": store.country_code,
					"website": `https://www.nike.com/retail/s/${store.slug}`
				}
			};

			const phoneNumber = earthutils.TelephoneStandardize(store.phone_number, {"country": storeObject.properties["addr:country"]});
			if (phoneNumber) {
				storeObject.properties.phone = phoneNumber;
			}

			const openingHours = openingHoursStringify(Object.keys(dayofweek.DayOfWeekAbbreviationsInverse).map((key) => {
				const dayOfWeek = dayofweek.DayOfWeekAbbreviationsInverse[key];
				const timeObject = store.regular_hours.find((obj) => obj.display_day.substr(0, 2) === dayOfWeek);
				if (!timeObject || timeObject.closed) {
					return null;
				} else {
					return [key, `${timeTo24HourTime(timeObject.display_start_time)}-${timeTo24HourTime(timeObject.display_end_time)}`];
				}
			}));
			if (openingHours && openingHours.length > 0) {
				storeObject.properties["opening_hours"] = openingHours;
			}

			return storeObject;
		});
	}
};
