const DayOfWeekAbbreviations = module.exports.DayOfWeekAbbreviations = {
	"Mo": "Monday",
	"Tu": "Tuesday",
	"We": "Wednesday",
	"Th": "Thursday",
	"Fr": "Friday",
	"Sa": "Saturday",
	"Su": "Sunday"
};

module.exports.DayOfWeekAbbreviationsInverse = Object.entries(DayOfWeekAbbreviations).reduce((obj, current) => {
	obj[current[1]] = current[0];

	return obj;
}, {});
