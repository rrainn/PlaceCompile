const earthutils = require("earthutils");
const capitalizefirstletter = require("../code/utils/capitalizefirstletter");

const initialURL = "https://shellgsllocator.geoapp.me/api/v1/locations/within_bounds?sw%5B%5D=-90&sw%5B%5D=-180&ne%5B%5D=90&ne%5B%5D=180";
const parserSettings = {
	"type": "json"
};

module.exports = {
	"defaultAttributes": {
		"brand:wikidata": "Q154950",
		"brand": "Shell",
		"amenity:fuel": true
	},
	initialURL,
	"parser": parserSettings,
	"download": async function (data) {
		let stores = [];

		const self = this;
		async function handlePage(data) {
			for (let item of data) {
				if (item.bounds) {
					const newData = await self.fetch(`https://shellgsllocator.geoapp.me/api/v1/locations/within_bounds?sw%5B%5D=${item.bounds["sw"][0]}&sw%5B%5D=${item.bounds['sw'][1]}&ne%5B%5D=${item.bounds['ne'][0]}&ne%5B%5D=${item.bounds['ne'][1]}`);
					await handlePage(newData);
				} else if (item.name) {
					stores.push(item);
				} else {
					throw new Error("Invalid data");
				}
			}
		}
		await handlePage(data);

		return stores;
	},
	"parse": function (data) {
		return data.map((item) => {
			if (item.inactive) {
				return null;
			}

			const store = {
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [
						item.lng,
						item.lat
					]
				},
				"properties": {
					"name": [`${item.name.toLowerCase().startsWith("shell") ? "" : "Shell"}`, item.name].filter((a) => !!a).join(" "),
					"ref": `${item.id || ""}`,
					...earthutils.AddressParser(item.address, {"standardizeStreet": true}),
					"addr:city": capitalizefirstletter(item.city),
					"addr:postcode": `${item.postcode}`,
					"addr:country": item.country_code,
					"website": item.website_url
				}
			};

			if (item.state && item.country_code === "US" && earthutils.USStateAbbreviations.USStateAbbreviations[item.state]) {
				store.properties["addr:state"] = earthutils.USStateAbbreviations.USStateAbbreviations[item.state];
			}

			const phoneNumber = earthutils.TelephoneStandardize(item.telephone, {"country": store.properties["addr:country"]});
			if (phoneNumber) {
				store.properties.phone = phoneNumber;
			}

			if (item.amenities.includes("twenty_four_hour")) {
				store.properties.opening_hours = "24/7";
			}
			if (item.amenities.includes("atm")) {
				store.properties.atm = true;
			}
			if (item.amenities.includes("toilet")) {
				store.properties["amenity:toilets"] = true;
			}
			if (item.amenities.includes("carwash")) {
				store.properties["car_wash"] = true;
			}
			if (item.amenities.includes("disabled_facilities")) {
				store.properties["wheelchair"] = true;
			}
			if (item.amenities.includes("hgv_lane")) {
				store.properties["hgv"] = true;
			}
			if (item.amenities.includes("shop")) {
				store.properties["shop"] = "convenience";
			}

			return store;
		}).filter(Boolean);
	}
};
