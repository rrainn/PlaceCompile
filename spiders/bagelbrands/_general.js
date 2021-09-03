const earthutils = require("earthutils");
const parseHref = require("../../code/utils/parseHref");
const DayIntervalsArrayOpeningHoursParser = require("../../code/utils/DayIntervalsArrayOpeningHoursParser");

const parserSettings = {
	"type": "html"
};

// https://bagelbrands.com
module.exports = (settings) => {
	function urlModifier (url) {
		if (settings.urlModifier && settings.urlModifier[url]) {
			return settings.urlModifier[url];
		}

		return url;
	}

	const initialURL = settings.initialURL;
	return {
		initialURL,
		"parser": parserSettings,
		"download": async function (data) {
			let stores = [];
			const self = this;
			async function parsePage(pageData, urlString) {
				const linksArray = pageData(".Directory-listItem a.Directory-listLink,.Directory-listTeaser a.Teaser-titleLink").toArray();

				for (let i = 0; i < linksArray.length; i++) {
					const element = linksArray[i];

					const href = pageData(element).attr("href");

					let newURL = parseHref(href, urlString);

					if (!newURL) {
						continue;
					}

					newURL = urlModifier(newURL);

					const fetchResponse = await self.fetch(newURL);
					const fetchParsed = await self.parse(fetchResponse, parserSettings);
					await parsePage(fetchParsed, newURL);
				}


				if (linksArray.length === 0) {
					urlString = urlModifier(urlString);
					const detailPageData = await self.fetch(urlString);
					const detailParsedPageData = await self.parse(detailPageData, parserSettings);
					stores.push({"storeHTML": detailParsedPageData.html(), "url": urlString});
				}
			}
			await parsePage(data, initialURL);

			return stores;
		},
		"parse": async function (stores) {
			const self = this;
			return Promise.all(stores.map(async (obj) => {
				const {storeHTML, url} = obj;
				const store = await self.parse(storeHTML, parserSettings);

				const urlParts = url.split("/");
				const storeObject = {
					"type": "Feature",
					"geometry": {
						"type": "Point",
						"coordinates": [
							parseFloat(store("meta[itemprop=longitude]").attr("content")),
							parseFloat(store("meta[itemprop=latitude]").attr("content"))
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
						"website": url
					}
				};

				let phoneHref = store("div.NAP-phone a.c-phone-main-number-link").attr("href");
				if (phoneHref) {
					storeObject.properties.phone = phoneHref.replace("tel:", "");
				}

				if (storeObject.properties["addr:country"] === "US") {
					storeObject.properties["addr:state"] = earthutils.USStateAbbreviations.USStateAbbreviations[store("div#address span.c-address-state").text()];
				}

				const openingHours = DayIntervalsArrayOpeningHoursParser(JSON.parse(store("span.js-location-hours").attr("data-days")));
				if (openingHours && openingHours.length > 0) {
					storeObject.properties["opening_hours"] = openingHours;
				}

				return storeObject;
			}));
		}
	};
};
