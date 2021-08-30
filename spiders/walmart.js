const earthutils = require("earthutils");
const DayIntervalsArrayOpeningHoursParser = require("../code/utils/DayIntervalsArrayOpeningHoursParser");
const { DayOfWeekAbbreviations } = require("../code/utils/dayofweek");

const initialURL = "https://www.walmart.com/sitemap_store_main.xml";

const parserSettings = {
	"type": "xml"
};

module.exports = {
	"defaultAttributes": {
		"brand:wikidata": "Q483551",
		"brand": "Walmart"
	},
	initialURL,
	"parser": parserSettings,
	"download": async function (data) {
		let stores = [];

		const storeURLs = data.urlset.url.map((url) => url.loc).filter((url) => url.endsWith("/details"));

		await Promise.all(storeURLs.map(async (storeURL) => {
			let fetchResponse;
			try {
				// ignoreRetryStatusCodes means we will bail early and not retry the request if the status code is 404
				fetchResponse = await this.fetch(storeURL, {"ignoreRetryStatusCodes": [404]});
			} catch (e) {
				if (e.response && e.response.status === 404) {
					return;
				} else {
					throw e;
				}
			}
			const pageData = await this.parse(fetchResponse, {"type": "html"});

			const jsonData = [];
			pageData("script").each((_, b) => {
				const data = pageData(b).html();
				if (data.includes("window.__WML_REDUX_INITIAL_STATE__ = {")) {
					jsonData.push(data);
				}
			});

			if (jsonData.length !== 1) {
				throw new Error("jsonData should be 1, instead got: " + jsonData.length);
			};

			const storeDetailJSON = JSON.parse(jsonData[0].replace(/^window\.__WML_REDUX_INITIAL_STATE__ = \{/gmu, "{").replace(/\};$/gmu, "}"));
			stores.push({...storeDetailJSON, "url": storeURL});
		}));

		return stores;
	},
	"parse": function (data) {
		return data.map((store) => {
			const storeObject = {
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [
						store.store.geoPoint.longitude,
						store.store.geoPoint.latitude
					]
				},
				"properties": {
					"name": store.store.displayName,
					"ref": `${store.store.id}`,
					...earthutils.AddressParser(store.store.address.streetAddress, {"standardizeStreet": true}),
					"addr:city": store.store.address.city,
					"addr:state": store.store.address.state,
					"addr:postcode": `${store.store.address.postalCode}`,
					"addr:country": store.store.address.country,
					"website": store.store.detailsPageURL
				}
			};

			const phoneNumber = earthutils.TelephoneStandardize(store.store.phone, {"country": storeObject.properties["addr:country"]});
			if (phoneNumber) {
				storeObject.properties["phone"] = phoneNumber;
			}

			const openingHours = DayIntervalsArrayOpeningHoursParser(Object.values(DayOfWeekAbbreviations).map((day) => {
				const hoursDayObject = store.store.operationalHours[`${day.toLowerCase()}Hrs`];
				if (!hoursDayObject) {
					return null;
				}
				if (hoursDayObject.closed) {
					return null;
				}

				if (!hoursDayObject.endHr || !hoursDayObject.startHr) {
					console.error("No data: ", store.store.id, store.store.operationalHours);
					return null;
				}

				return {
					"day": day.toUpperCase(),
					"intervals": [{"end": parseInt(hoursDayObject.endHr.replace(":", "")), "start": parseInt(hoursDayObject.startHr.replace(":", ""))}]
				};
			}).filter(Boolean));
			if (openingHours && openingHours.length > 0) {
				storeObject.properties["opening_hours"] = openingHours;
			}

			return storeObject;
		});
	}
};
