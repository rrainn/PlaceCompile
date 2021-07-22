const capitalizefirstletter = require("./capitalizefirstletter");
const dayofweek = require("./dayofweek");

module.exports = function(arr) {
	const returnValue = arr.reduce((existingValue, value) => {
		if (value === null) {
			existingValue.push(value);
			return existingValue;
		}

		const [dayOfWeek, time] = value;
		const lastItemIndex = existingValue.length - 1;
		const lastItem = existingValue[lastItemIndex];
		const newDayOfWeek = dayofweek.DayOfWeekAbbreviationsInverse[capitalizefirstletter(dayOfWeek)];

		if (lastItem) {
			const [lastItemDay, lastItemTime] = lastItem;

			if (lastItemTime === time) {
				if (lastItemDay.includes("-")) {
					existingValue[lastItemIndex][0] = lastItemDay.replace(`-${lastItemDay.split("-")[1]}`, `-${newDayOfWeek}`);
				} else {
					existingValue[lastItemIndex][0] = `${lastItemDay}-${newDayOfWeek}`;
				}

				return existingValue;
			}
		}

		existingValue.push([newDayOfWeek, time]);
		return existingValue;
	}, []).filter((a) => a !== null).map((item) => item.join(" ")).join("; ");

	if (returnValue === "Mo-Su 00:00-00:00") {
		return "24/7";
	}

	return returnValue;
};
