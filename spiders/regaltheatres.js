const earthutils = require("earthutils");

module.exports = {
	"defaultAttributes": {
		"brand:wikidata": "Q835638",
		"brand": "Regal Theatres"
	},
	"initialURL": "https://www.regmovies.com/theatres/regal-riviera/0690",
	"parser": {
		"type": "html"
	},
	"parse": function (pageData) {
		const jsonData = [];
		pageData("script").each((_, b) => {
			const data = pageData(b).html();
			if (data.includes("apiSitesList")) {
				jsonData.push(data.match(/^(\s*?)apiSitesList = (.*),/mu)[2]);
			}
		});

		if (jsonData.length > 1) {
			throw new Error("Multiple apiSitesList found");
		}

		return JSON.parse(jsonData[0]).map((location) => {
			return {
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [
						location.longitude,
						location.latitude
					]
				},
				"properties": {
					"name": location.name,
					"ref": `${location.externalCode}`,
					...earthutils.AddressParser(location.address.address1, {"standardizeStreet": true}),
					"addr:city": location.address.city,
					"addr:state": location.address.state,
					"addr:postcode": `${location.address.postalCode}`,
					"addr:country": "US",
					"website": `https://www.regmovies.com${location.uri}`
				}
			};
		});
	}
};
