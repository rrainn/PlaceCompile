const earthutils = require("earthutils");
const decodeHTMLCharacters = require("../code/utils/decodeHTMLCharacters");
const DayIntervalsArrayOpeningHoursParser = require("../code/utils/DayIntervalsArrayOpeningHoursParser");

const initialURL = "https://locator.chase.com/sitemap.xml";

const parserSettings = {
	"type": "xml"
};

module.exports = {
	"defaultAttributes": {
		"brand:wikidata": "Q524629",
		"brand": "Chase"
	},
	initialURL,
	"parser": parserSettings,
	"type": "single", // default is "array". When using "single", it expects "download" function to return an array of URL strings, and will pass in a single entity to the "parse" function. This fixes an issue with memory usage with large spiders. "single" also only works with HTML pages.
	"download": async function (data) {
		const storeURLs = data.urlset.url.map((url) => url.loc).filter((url) => {
			// check if url matches https://locator.chase.com/.+?/.+?/.+$ regex and doesn't include `chase.com/es/`
			return url.match(/^https:\/\/locator\.chase\.com\/.+?\/.+?\/.+$/) && !url.includes("chase.com/es/");
		}).map(decodeHTMLCharacters);

		return storeURLs;
	},
	"parse": function (store) {
		const pageData = this.parse(store.html, {"type": "html"});

		const storeObject = {
			"type": "Feature",
			"geometry": {
				"type": "Point",
				"coordinates": [
					parseFloat(pageData("meta[itemprop=longitude]").attr("content")),
					parseFloat(pageData("meta[itemprop=latitude]").attr("content"))
				]
			},
			"properties": {
				"name": pageData("h1#location-name").text(),
				"ref": `${store.url.split("/").pop()}`,
				...earthutils.AddressParser(["c-address-street-1", "c-address-street-2"].map((classTxt) => pageData(`#address span.${classTxt}`).text()).filter(Boolean).join(" ").trim(), {"standardizeStreet": true}),
				"addr:city": pageData("#address span.c-address-city").text(),
				"addr:postcode": `${pageData("#address span[itemprop=postalCode]").text()}`.trim(),
				"addr:country": pageData("#address abbr.c-address-country-name").text(),
				"website": store.url
			}
		};

		if (storeObject.properties["addr:country"] === "US") {
			storeObject.properties["addr:state"] = pageData("#address abbr[itemprop=addressRegion]").text();
		}

		const phoneNumber = earthutils.TelephoneStandardize(pageData("div#phone-main").text(), {"country": storeObject.properties["addr:country"]});
		if (phoneNumber) {
			storeObject.properties.phone = phoneNumber;
		}

		const hours = JSON.parse(pageData("script.js-hours-config").html());
		if (hours) {
			const openingHours = DayIntervalsArrayOpeningHoursParser(hours.hours);
			if (openingHours && openingHours.length > 0) {
				storeObject.properties["opening_hours"] = openingHours;
			}
		}

		return storeObject;
	}
};
