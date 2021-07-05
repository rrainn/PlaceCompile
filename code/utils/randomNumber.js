export default function(min, max) {
	if (typeof min !== "number" || typeof max !== "number") {
		return Math.floor(Math.random() * 100) + 1;
	} else {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}
}
