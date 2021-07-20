module.exports = (path) => {
	return new Promise((resolve) => {
		const fs = require("fs");

		const array = [];
		let pendingStr = "";

		const stream = fs.createReadStream(path);

		stream.on("data", (data) => {
			data = `${pendingStr}${data.toString()}`;
			const isCompleteObject = data.endsWith("\n");

			const dataElements = data.split("\n");
			while (dataElements.length > 0) {
				let line = dataElements.shift();

				if (dataElements.length === 0 && !isCompleteObject) {
					pendingStr = line;
				} else {
					if (line === "[" || line === "]" || line.length === 0) {
						continue;
					}

					// Remove the trailing comma
					line = line.replace(/,$/gmu, "");

					const obj = JSON.parse(line);
					array.push(obj);
				}
			}
		});

		stream.on("end", () => resolve(array));
	});
};
