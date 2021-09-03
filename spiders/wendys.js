const earthutils = require("earthutils");
const DayIntervalsArrayOpeningHoursParser = require("../code/utils/DayIntervalsArrayOpeningHoursParser");

module.exports = {
	"defaultAttributes": {
		"brand:wikidata": "Q550258",
		"brand": "Wendy's"
	},
	"initialURL": "https://locations.wendys.com/sitemap.xml",
	"parser": {
		"type": "xml"
	},
	"type": "single", // default is "array". When using "single", it expects "download" function to return an array of URL strings, and will pass in a single entity to the "parse" function. This fixes an issue with memory usage with large spiders. "single" also only works with HTML pages.
	"downloadFetchSettings": {"discardStatusCodes": [404]}, // Status codes that are allowed and will be discarded before passing into parse function.
	"download": async function (data) {
		const storeURLs = data.urlset.url.map((obj) => obj.loc).filter((url) => url.replace("https://", "").split("/").length >= 5);

		return storeURLs;
	},
	"parse": function (store) {
		const pageData = this.parse(store.html, {"type": "html"});

		const storeObject = {
			"type": "Feature",
			"geometry": {
				"type": "Point",
				"coordinates": [
					parseFloat(pageData("section.LocationInfo span.coordinates meta[itemprop=longitude]").attr("content")),
					parseFloat(pageData("section.LocationInfo span.coordinates meta[itemprop=latitude]").attr("content"))
				]
			},
			"properties": {
				"name": "Wendy's",
				"ref": store.url.replaceAll("https://locations.wendys.com/", ""),
				...earthutils.AddressParser(pageData("section.LocationInfo address.c-address[itemprop=address] meta[itemprop=streetAddress]").attr("content"), {"standardizeStreet": true}),
				"addr:city": pageData("section.LocationInfo address.c-address[itemprop=address] meta[itemprop=addressLocality]").attr("content"),
				"addr:postcode": `${pageData("section.LocationInfo address.c-address[itemprop=address] span.c-address-postal-code[itemprop=postalCode]").text()}`,
				"addr:country": pageData("section.LocationInfo address.c-address[itemprop=address] abbr.c-address-country-name[itemprop=addressCountry]").text(),
				"website": store.url
			}
		};

		if (storeObject.properties["addr:country"] === "US") {
			storeObject.properties["addr:state"] = pageData("section.LocationInfo address.c-address[itemprop=address] abbr.c-address-state[itemprop=addressRegion]").text();
		}

		const phoneNumberHref = pageData("section.LocationInfo div.c-phone-main a.c-phone-main-number-link").attr("href");
		if (phoneNumberHref) {
			const phoneNumberText = phoneNumberHref.replace("tel:", "");
			const phoneNumber = earthutils.TelephoneStandardize(phoneNumberText, {"country": storeObject.properties["addr:country"]});
			if (phoneNumber) {
				storeObject.properties.phone = phoneNumber;
			}
		}

		const hours = JSON.parse(pageData("section.LocationInfo div.LocationInfo-hours div.js-location-hours").attr("data-days"));
		const openingHours = DayIntervalsArrayOpeningHoursParser(hours);
		if (openingHours && openingHours.length > 0) {
			storeObject.properties["opening_hours"] = openingHours;
		}

		return storeObject;
	}
};
