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
	"parse": async function (data) {
		const self = this;
		let stores = [];
		async function handlePage(data) {
			for (let item of data) {
				if (item.bounds) {
					const newData = await self.fetch(`https://shellgsllocator.geoapp.me/api/v1/locations/within_bounds?sw%5B%5D=${item.bounds["sw"][0]}&sw%5B%5D=${item.bounds['sw'][1]}&ne%5B%5D=${item.bounds['ne'][0]}&ne%5B%5D=${item.bounds['ne'][1]}`);
					await handlePage(newData);
				} else if (item.name) {
					const store = await handleStore(item);
					if (store) {
						stores.push(store);
					}
				} else {
					throw new Error("Invalid data");
				}
			}
		}
		async function handleStore(data) {
			if (data.inactive) {
				return null;
			}

			const store = {
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [
						data.lng,
						data.lat
					]
				},
				"properties": {
					"name": [`${data.name.toLowerCase().startsWith("shell") ? "" : "Shell"}`, data.name].filter((a) => !!a).join(" "),
					"ref": `${data.id || ""}`,
					...earthutils.AddressParser(data.address, {"standardizeStreet": true}),
					"addr:city": capitalizefirstletter(data.city),
					"addr:postcode": `${data.postcode}`,
					"addr:country": data.country_code,
					"website": data.website_url
				}
			};

			if (data.state && data.country_code === "US" && earthutils.USStateAbbreviations.USStateAbbreviations[data.state]) {
				store.properties["addr:state"] = earthutils.USStateAbbreviations.USStateAbbreviations[data.state];
			}

			if (data.telephone && data.telephone.startsWith("+1") && data.telephone.length === 15) {
				store.properties.phone = `+1-${data.telephone[3]}${data.telephone[4]}${data.telephone[5]}-${data.telephone[7]}${data.telephone[8]}${data.telephone[9]}-${data.telephone[11]}${data.telephone[12]}${data.telephone[13]}${data.telephone[14]}`;
			}

			if (data.amenities.includes("twenty_four_hour")) {
				store.properties.opening_hours = "24/7";
			}
			if (data.amenities.includes("atm")) {
				store.properties.atm = true;
			}
			if (data.amenities.includes("toilet")) {
				store.properties["amenity:toilets"] = true;
			}
			if (data.amenities.includes("carwash")) {
				store.properties["car_wash"] = true;
			}
			if (data.amenities.includes("disabled_facilities")) {
				store.properties["wheelchair"] = true;
			}
			if (data.amenities.includes("hgv_lane")) {
				store.properties["hgv"] = true;
			}
			if (data.amenities.includes("shop")) {
				store.properties["shop"] = "convenience";
			}

			return store;
		}
		await handlePage(data);

		return stores;
	}
};
