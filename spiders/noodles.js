const earthutils = require("earthutils");
const parseHref = require("../code/utils/parseHref");
const DayIntervalsArrayOpeningHoursParser = require("../code/utils/DayIntervalsArrayOpeningHoursParser");

const initialURL = "https://locations.noodles.com/";
const parserSettings = {
	"type": "html"
};

module.exports = {
	"defaultAttributes": {
		"brand:wikidata": "Q7049673",
		"brand": "Noodles & Company"
	},
	initialURL,
	"parser": parserSettings,
	"download": async function (data) {
		let stores = [];
		const self = this;
		async function parsePage(pageData, urlString) {
			const linksArray = pageData("a.c-directory-list-content-item-link,a.c-location-grid-item-link").toArray();

			for (let i = 0; i < linksArray.length; i++) {
				const element = linksArray[i];

				const href = pageData(element).attr("href");

				const newURL = parseHref(href, urlString);

				if (!newURL.startsWith("https://locations.noodles.com/")) {
					continue;
				}

				const fetchResponse = await self.fetch(newURL);
				const fetchParsed = await self.parse(fetchResponse, parserSettings);
				await parsePage(fetchParsed, newURL);
			}

			if (linksArray.length === 0) {
				stores.push({"html": pageData.html(), "url": urlString});
			}
		}
		await parsePage(data, initialURL);

		return stores;
	},
	"parse": function (data) {
		return data.map((store) => {
			const {html, url} = store;
			const pageData = this.parse(html, parserSettings);
			const storeObject = {
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [
						parseFloat(pageData("div.nap-address-wrapper meta[itemprop=longitude]").attr("content")),
						parseFloat(pageData("div.nap-address-wrapper meta[itemprop=latitude]").attr("content"))
					]
				},
				"properties": {
					"name": pageData("div.about-wrapper span.location-name-geo").text(),
					"ref": url.replaceAll("https://locations.noodles.com/", "").replaceAll(".html", ""),
					...earthutils.AddressParser(["c-address-street-1", "c-address-street-2"].map((classTxt) => pageData(`div.nap-address-wrapper span.${classTxt}`).text()).filter(Boolean).join("").trim(), {"standardizeStreet": true}),
					"addr:city": pageData("div.nap-address-wrapper span[itemprop=addressLocality]").text(),
					"addr:postcode": `${pageData("div.nap-address-wrapper span[itemprop=postalCode]").text()}`.trim(),
					"addr:state": pageData("div.nap-address-wrapper abbr[itemprop=addressRegion]").text(),
					"addr:country": pageData("div.nap-address-wrapper abbr.c-address-country-name").text(),
					"website": url
				}
			};

			const phoneNumber = pageData("div.nap-phone-wrapper a.c-phone-main-number-link").attr("href") && earthutils.TelephoneStandardize(pageData("div.nap-phone-wrapper a.c-phone-main-number-link").attr("href").replace("tel:", ""), {"country": storeObject.properties["addr:country"]});
			if (phoneNumber) {
				storeObject.properties.phone = phoneNumber;
			}

			const hours = JSON.parse(pageData("div.js-location-hours").attr("data-days"));
			const openingHours = DayIntervalsArrayOpeningHoursParser(hours);
			if (openingHours && openingHours.length > 0) {
				storeObject.properties["opening_hours"] = openingHours;
			}

			return storeObject;
		});
	}
};
