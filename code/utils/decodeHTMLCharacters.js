module.exports = (string) => {
	const values = {
		'&amp;': '&',
		'&lt;': '<',
		'&gt;': '>',
		'&quot;': '"',
		'&#39;': "'",
		'&#039;': "'",
		'&#x2F;': '/',
		'&#x60;': '`',
		'&#x3D;': '=',
		'&#x3C;': '<',
		'&#x3E;': '>',
		'&#x22;': '"',
		'&#x27;': "'",
		'&#x2F;': '/',
		'&#x60;': '`',
		'&#x3D;': '=',
		'&#x3C;': '<',
		'&#x3E;': '>',
		'&#x22;': '"',
	};

	return Object.entries(values).reduce((acc, [key, value]) => acc.replaceAll(key, value), string);
};
