const earthutils = require("earthutils");
const dayofweek = require("../code/utils/dayofweek");
const openingHoursStringify = require("../code/utils/openingHoursStringify");
const parseHref = require("../code/utils/parseHref");
const insertString = require("../code/utils/insertString");
const cheerio = require("cheerio");

const initialURL = "https://locations.brueggers.com/us";
const parserSettings = {
	"type": "html"
};

module.exports = {
	"defaultAttributes": {
		"brand:wikidata": "Q4978656",
		"brand": "Bruegger's Bagels"
	},
	initialURL,
	"parser": parserSettings,
	"parse": async function (data) {
		let stores = [];
		const self = this;
		async function parsePage(pageData, urlString) {
			const linksArray = pageData(".Directory-listItem a.Directory-listLink,.Directory-listTeaser a.Teaser-titleLink").toArray();

			for (let i = 0; i < linksArray.length; i++) {
				const element = linksArray[i];

				const href = pageData(element).attr("href");

				const newURL = parseHref(href, urlString);

				if (!newURL) {
					continue;
				}

				const fetchResponse = await self.fetch(newURL);
				const fetchParsed = await self.parse(fetchResponse, parserSettings);
				await parsePage(fetchParsed, newURL);
			}


			if (linksArray.length === 0) {
				const detailPageData = await self.fetch(urlString);
				const detailParsedPageData = await self.parse(detailPageData, parserSettings);
				stores.push({"store": detailParsedPageData, "url": urlString});
			}
		}
		await parsePage(data, initialURL);

		return stores.map((obj) => {
			const {store, url} = obj;

			const urlParts = url.split("/");
			const storeObject = {
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [
						store("meta[itemprop=longitude]").attr("content"),
						store("meta[itemprop=latitude]").attr("content")
					]
				},
				"properties": {
					"name": store("h1#location-name").text(),
					"ref": urlParts[urlParts.length - 1],
					...earthutils.AddressParser(["1", "2"].map((num) => {
						return store(`div#address span.c-address-street-${num}`).text();
					}).filter((a) => !!a).join(" "), {"standardizeStreet": true}),
					"addr:city": store("div#address span.c-address-city").text(),
					"addr:postcode": store("div#address span[itemprop=postalCode]").text(),
					"addr:country": store("div#address abbr[itemprop=addressCountry]").text(),
					"phone": store("div.NAP-phone a.c-phone-main-number-link").attr("href").replace("tel:", ""),
					"website": url
				}
			};

			if (storeObject.properties["addr:country"] === "US") {
				storeObject.properties["addr:state"] = earthutils.USStateAbbreviations.USStateAbbreviations[store("div#address span.c-address-state").text()];
			}

			// TODO: this code for opening hours is almost identical to the code in the the Subway spider. We should probably abstract it out.
			const openingHours = openingHoursStringify(Object.keys(dayofweek.DayOfWeekAbbreviationsInverse).map((dayOfWeek) => dayOfWeek.toUpperCase()).map((dayOfWeek) => {
				const dayHourObject = JSON.parse(store("span.js-location-hours").attr("data-days")).find((obj) => obj.day === dayOfWeek);
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
