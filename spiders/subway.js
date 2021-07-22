const earthutils = require("earthutils");
const dayofweek = require("../code/utils/dayofweek");
const openingHoursStringify = require("../code/utils/openingHoursStringify");
const parseHref = require("../code/utils/parseHref");
const insertString = require("../code/utils/insertString");

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
	"parse": async function (data) {
		let stores = [];
		const self = this;
		async function parsePage(pageData, urlString) {
			const linksArray = pageData(".Directory-listLinks .Directory-listItem:not(.is-hidden) a,.Directory-listTeasers a").toArray();

			for (let i = 0; i < linksArray.length; i++) {
				const element = linksArray[i];

				const href = pageData(element).attr("href");

				const newURL = parseHref(href, urlString);
				const fetchResponse = await self.fetch(newURL);
				const fetchParsed = await self.parse(fetchResponse, parserSettings);
				await parsePage(fetchParsed, newURL);
			}


			if (linksArray.length === 0) {
				let storeDetailJSON = JSON.parse(pageData("script.js-hours-config").html()) || JSON.parse(pageData("script.js-map-config").html()).entities[0];
				storeDetailJSON.url = urlString;
				stores.push(storeDetailJSON);
			}
		}
		await parsePage(data, initialURL);

		return stores.map((store) => {
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

			if (store.profile.mainPhone && store.profile.mainPhone.countryCode === "US") {
				if (store.profile.mainPhone.number.length === 12) {
					storeObject.properties.phone = `+1-${store.profile.mainPhone.number[2]}${store.profile.mainPhone.number[3]}${store.profile.mainPhone.number[4]}-${store.profile.mainPhone.number[5]}${store.profile.mainPhone.number[6]}${store.profile.mainPhone.number[7]}-${store.profile.mainPhone.number[8]}${store.profile.mainPhone.number[9]}${store.profile.mainPhone.number[10]}${store.profile.mainPhone.number[11]}`;
				}
			}

			const openingHours = openingHoursStringify(Object.keys(dayofweek.DayOfWeekAbbreviationsInverse).map((dayOfWeek) => dayOfWeek.toUpperCase()).map((dayOfWeek) => {
				const dayHourObject = (store.profile.hours || store.hours)?.normalHours.find((obj) => obj.day === dayOfWeek);
				if (!dayHourObject || dayHourObject.isClosed || dayHourObject.intervals.length === 0) {
					return null;
				} else {
					const hours = dayHourObject.intervals.reduce((arr, current) => {
						arr.push(`${insertString(`${current.start}`.padStart(4, "0"), 2, ":")}-${insertString(`${current.end}`.padStart(4, "0"), 2, ":")}`);
						return arr;
					}, []).join(",");
					return [dayOfWeek, hours];
				}
			}));
			if (openingHours.length > 0) {
				storeObject.properties["opening_hours"] = openingHours;
			}

			return storeObject;
		});
	}
};
