const dayofweek = require("./dayofweek");
const openingHoursStringify = require("./openingHoursStringify");

// https://schema.org/openingHoursSpecification
module.exports = (openingHoursSpecification) => {
	if (openingHoursSpecification.length > 7) {
		throw new Error("openingHoursSpecification is too long");
	}

	return openingHoursStringify(Object.keys(dayofweek.DayOfWeekAbbreviationsInverse).map((dayOfWeek) => {
		const dayHourObject = openingHoursSpecification.find((obj) => obj.dayOfWeek === dayOfWeek);
		if (!dayHourObject) {
			return null;
		} else {
			const opens = dayHourObject.opens.replace(/:00$/gmu, "");
			const closes = dayHourObject.closes.replace(/:00$/gmu, "");

			if (opens.split(":").length !== 2 || closes.split(":").length !== 2) {
				throw new Error("openingHoursSpecification is not valid");
			}

			return [dayOfWeek, `${opens}-${closes}`];
		}
	}));
};
