// Example:
/*
{
	'@context': 'http://schema.org',
	'@type': 'Store',
	'@id': '16153',
	url: 'https://www.walgreens.com/locator/walgreens-2901+wakefield+pines+dr-raleigh-nc-27614/id=16153',
	name: 'Walgreens',
	image: 'https://www.walgreens.com/images/adaptive/share/images/logos/walgreens_icon_logo_1000x1032.jpg',
	address: {
		'@type': 'PostalAddress',
		streetAddress: '2901 WAKEFIELD PINES DR',
		addressLocality: 'Raleigh',
		addressRegion: 'NC',
		postalCode: '27614',
		addressCountry: 'US'
	},
	geo: {
		'@type': 'GeoCoordinates',
		latitude: '35.94269808',
		longitude: '-78.55900488'
	},
	description: 'Visit your local Walgreens for health and wellness products, personal care items, and photo services',
	telephone: '919-569-6741',
	openingHoursSpecification: [
		{
			'@type': 'OpeningHoursSpecification',
			dayOfWeek: 'Sat',
			opens: '09:00',
			closes: '21:00'
		},
		{
			'@type': 'OpeningHoursSpecification',
			dayOfWeek: 'Sun',
			opens: '09:00',
			closes: '21:00'
		},
		{
			'@type': 'OpeningHoursSpecification',
			dayOfWeek: 'Mon',
			opens: '09:00',
			closes: '21:00'
		},
		{
			'@type': 'OpeningHoursSpecification',
			dayOfWeek: 'Tue',
			opens: '09:00',
			closes: '21:00'
		},
		{
			'@type': 'OpeningHoursSpecification',
			dayOfWeek: 'Wed',
			opens: '09:00',
			closes: '21:00'
		},
		{
			'@type': 'OpeningHoursSpecification',
			dayOfWeek: 'Thu',
			opens: '09:00',
			closes: '21:00'
		},
		{
			'@type': 'OpeningHoursSpecification',
			dayOfWeek: 'Fri',
			opens: '09:00',
			closes: '21:00'
		}
	],
	department: [
		{
			'@type': 'Pharmacy',
			name: 'Walgreens Pharmacy',
			image: 'https://www.walgreens.com/images/adaptive/share/images/logos/walgreens_icon_logo_1000x1032.jpg',
			description: 'Refill your prescription, transfer your existing prescriptions and schedule a flu shots at Walgreens Pharmacy.',
			telephone: '919-569-6741',
			OpeningHoursSpecification: [Array]
		}
	]
}
*/

const OpeningHoursSpecificationParser = require("./OpeningHoursSpecificationParser");
const earthutils = require("earthutils");

// store.address.addressCountry must be a 2 character code
module.exports = (store) => {
	const storeObject = {
		"type": "Feature",
		"geometry": {
			"type": "Point",
			"coordinates": [
				parseFloat(store.geo.longitude),
				parseFloat(store.geo.latitude)
			]
		},
		"properties": {
			"name": store.name,
			"ref": store["@id"],
			...earthutils.AddressParser(store.address.streetAddress, {"standardizeStreet": true}),
			"addr:city": store.address.addressLocality,
			"addr:postcode": `${store.address.postalCode}`,
			"addr:country": store.address.addressCountry,
			"website": store.url
		}
	};

	if (storeObject.properties["addr:country"] === "US") {
		storeObject.properties["addr:state"] = store.address.addressRegion;
	}

	const phoneNumber = earthutils.TelephoneStandardize(store.telephone, {"country": storeObject.properties["addr:country"]});
	if (phoneNumber) {
		storeObject.properties["phone"] = phoneNumber;
	}

	const openingHours = OpeningHoursSpecificationParser(store.openingHoursSpecification);
	if (openingHours && openingHours.length > 0) {
		storeObject.properties["opening_hours"] = openingHours;
	}

	return storeObject;
};
