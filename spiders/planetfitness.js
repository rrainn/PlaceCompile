const earthutils = require("earthutils");
const parseHref = require("../code/utils/parseHref");
const openingHoursStringify = require("../code/utils/openingHoursStringify");
const dayofweek = require("../code/utils/dayofweek");
const timeTo24HourTime = require("../code/utils/timeTo24HourTime");
const SchemaOrgStoreParser = require("../code/utils/SchemaOrgStoreParser");

const initialURL = "https://www.planetfitness.com/sitemap";
const parserSettings = {
	"type": "html"
};

module.exports = {
	"defaultAttributes": {
		"brand:wikidata": "Q7201095",
		"brand": "Planet Fitness"
	},
	initialURL,
	"parser": parserSettings,
	"download": async function (data) {
		let stores = [];

		const urls = data("td.club-title a[href]").toArray().map((item) => data(item).attr("href")).filter((url) => url.includes("/gyms/"));

		for (let i = 0; i < urls.length; i++) {
			const url = urls[i];
			const urlString = parseHref(url, initialURL);
			let fetchResponse;
			try {
				// ignoreRetryStatusCodes means we will bail early and not retry the request if the status code is 503
				fetchResponse = await this.fetch(urlString, {"ignoreRetryStatusCodes": [503]});
			} catch (e) {
				if (e.response && e.response.status === 503) {
					continue;
				} else {
					throw e;
				}
			}

			stores.push({"html": fetchResponse, "url": urlString});
		}
		return stores;
	},
	"parse": function (data) {
		return data.map((data) => {
			const pageData = this.parse(data.html, parserSettings);
			const store = JSON.parse(pageData("script[type=application/ld+json]").html())["@graph"][0];

			// TODO: this line was copied from Target spider. We should likely abstract this out into a SchemaOrgStoreParser setting or something.
			store.address.addressCountry = earthutils.CountryAbbreviations.CountryAbbreviations[store.address.addressCountry];

			const storeObject = SchemaOrgStoreParser(store);

			const hoursText = pageData("div#club-hours div.field--name-field-club-hours div.field__item p").text();
			if (hoursText === "Open & Staffed 24/7!") {
				storeObject.properties["opening_hours"] = "24/7";
			} else if (hoursText === "Coming Soon!") {
				storeObject.properties["opening_date"] = "future";
			} else if (hoursText === "Convenient hours when we reopen") {
				storeObject.properties["opening_hours"] = "closed";
			} else if (hoursText) {
				const hours = hoursText.split("\n");
				if (hours.length > 1) {
					const openingHours = openingHoursStringify(Object.keys(dayofweek.DayOfWeekAbbreviationsInverse).map((dayOfWeek) => {
						const dayHoursLine = hours.find((obj) => obj.startsWith(`${dayOfWeek}: `));
						if (!dayHoursLine) {
							return null;
						}
						const hoursValue = dayHoursLine.replace(`${dayOfWeek}: `, "");
						if (hoursValue === "Closed") {
							return null;
						} else if (hoursValue === "24 hrs") {
							return [dayOfWeek.toLowerCase(), "00:00-00:00"];
						} else {
							const [open, close] = hoursValue.split("-").map((str) => str.trim());
							if (!open || !close) {
								return null;
							}
							return [dayOfWeek.toLowerCase(), `${timeTo24HourTime(open)}-${timeTo24HourTime(close)}`];
						}
					}));
					if (openingHours && openingHours.length > 0) {
						storeObject.properties["opening_hours"] = openingHours;
					}
				}
			}

			return storeObject;
		});
	}
};
