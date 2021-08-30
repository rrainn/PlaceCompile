module.exports = (timeString) => {
	const [time, ampm] = timeString.split(" ");
	const [hour, minute] = time.split(":");

	if (ampm === "PM") {
		return `${parseInt(hour) + 12}:${minute}`;
	} else {
		return `${hour}:${minute}`;
	}
};
