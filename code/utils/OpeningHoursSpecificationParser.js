const dayofweek = require("./dayofweek");
const openingHoursStringify = require("./openingHoursStringify");

// https://schema.org/openingHoursSpecification
module.exports = (openingHoursSpecification) => {
	if (openingHoursSpecification.length > 7) {
		throw new Error("openingHoursSpecification is too long");
	}

	return openingHoursStringify(Object.keys(dayofweek.DayOfWeekAbbreviationsInverse).map((dayOfWeek) => {
		const dayHourObject = openingHoursSpecification.find((obj) => obj.dayOfWeek === dayOfWeek);
		if (!dayHourObject || !dayHourObject.opens || !dayHourObject.closes) {
			return null;
		} else {
			const opensParts = dayHourObject.opens.split(":");
			const closesParts = dayHourObject.closes.split(":");

			// Get first two parts of open parts
			const opens = opensParts[0] + ":" + opensParts[1];
			// Get first two parts of close parts
			const closes = closesParts[0] + ":" + closesParts[1];

			return [dayOfWeek, `${opens}-${closes}`];
		}
	}));
};
