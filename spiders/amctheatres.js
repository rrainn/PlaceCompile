const earthutils = require("earthutils");

const dataObjectAttributeReducer = (obj, current) => {
	obj[current["@_name"]] = current["#text"];
	return obj;
};

module.exports = {
	"defaultAttributes": {
		"brand:wikidata": "Q294721",
		"brand": "AMC Theatres"
	},
	"initialURL": "https://www.amctheatres.com/sitemaps/sitemap-theatres.xml",
	"parser": {
		"type": "xml",
		"settings": {
			"ignoreAttributes" : false,
			"parseTrueNumberOnly": true
		}
	},
	"parse": function (data) {
		return data.urlset.url.map((location) => {
			const theatreObject = location.PageMap.DataObject.find((obj) => obj["@_type"] === "theatre").Attribute.reduce(dataObjectAttributeReducer, {});
			const contentObject = location.PageMap.DataObject.find((obj) => obj["@_type"] === "content").Attribute.reduce(dataObjectAttributeReducer, {});

			if (contentObject.type !== "Theatre") {
				return null;
			}

			const addressLine1 = theatreObject.addressLine1.split(" ");
			const [addressNumber, ...street] = addressLine1;

			const object = {
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [
						theatreObject.longitude,
						theatreObject.latitude
					]
				},
				"properties": {
					"name": contentObject.title,
					"ref": `${theatreObject.theatreId}`,
					...earthutils.AddressParser(theatreObject.addressLine1, {"standardizeStreet": true}),
					"addr:city": theatreObject.city,
					"addr:state": theatreObject.state,
					"addr:postcode": `${theatreObject.postalCode}`,
					"website": location.loc
				}
			};
			if (location["image:image"] && location["image:image"]["image:loc"]) {
				object.properties.image = location["image:image"]["image:loc"];
			}
			return object;
		}).filter((location) => location !== null);
	},
	"postProcess": (data) => {
		return data.map((item) => {
			if (item.properties.ref === "7950" && item.properties["addr:street"] === "N.Central Expressway") {
				item.properties["addr:street"] = earthutils.StreetStandardize("N. Central Expressway");
			}
			if (item.properties.ref === "421" && item.properties["addr:street"] === "West Carson St Spc 73") {
				const addrObj = earthutils.AddressParser(`${item.properties["addr:housenumber"]} West Carson St Ste. 73`, {"standardizeStreet": true});
				Object.keys(addrObj).forEach((key) => {
					item.properties[key] = addrObj[key];
				});
			}

			return item;
		});
	}
};
