// 11:00 AM
// 11:00AM
// 5:00am
module.exports = (timeString) => {
	timeString = timeString.trim().toUpperCase();

	if (!timeString.includes(" ")) {
		if (timeString.endsWith("PM")) {
			timeString = timeString.replace("PM", " PM");
		} else if (timeString.endsWith("AM")) {
			timeString = timeString.replace("AM", " AM");
		} else {
			throw new Error(`Can't parse AM or PM for ${timeString}`);
		}
	}

	const [time, ampm] = timeString.split(" ");
	const [hour, minute] = time.split(":");

	if (ampm === "PM") {
		return `${parseInt(hour) + 12}:${minute}`;
	} else {
		return `${hour}:${minute}`;
	}
};
