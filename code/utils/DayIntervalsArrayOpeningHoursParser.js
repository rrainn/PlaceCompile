const dayofweek = require("./dayofweek");
const insertString = require("./insertString");
const openingHoursStringify = require("./openingHoursStringify");

// [{"day":"MONDAY","intervals":[{"end":1500,"start":530}]},{"day":"TUESDAY","intervals":[{"end":1500,"start":530}]},{"day":"WEDNESDAY","intervals":[{"end":1500,"start":530}]},{"day":"THURSDAY","intervals":[{"end":1500,"start":530}]},{"day":"FRIDAY","intervals":[{"end":1500,"start":530}]},{"day":"SATURDAY","intervals":[{"end":1600,"start":530}]},{"day":"SUNDAY","intervals":[{"end":1500,"start":530}]}]
module.exports = (hoursObj) => {
	if (!hoursObj) {
		return undefined;
	}

	return openingHoursStringify(Object.keys(dayofweek.DayOfWeekAbbreviationsInverse).map((dayOfWeek) => dayOfWeek.toUpperCase()).map((dayOfWeek) => {
		const dayHourObject = hoursObj.find((obj) => obj.day === dayOfWeek);
		if (!dayHourObject || dayHourObject.isClosed || dayHourObject.intervals.length === 0) {
			return null;
		} else {
			const hours = dayHourObject.intervals.reduce((arr, current) => {
				arr.push(`${insertString(`${current.start}`.padStart(4, "0"), 2, ":")}-${insertString(`${current.end}`.padStart(4, "0"), 2, ":")}`);
				return arr;
			}, []).join(",");
			return [dayOfWeek, hours];
		}
	}));
};
