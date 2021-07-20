module.exports = function (str, index, stringToAdd) {
	return str.substring(0, index) + stringToAdd + str.substring(index, str.length);
};
