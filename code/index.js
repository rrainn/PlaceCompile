const { program, Option } = require("commander");

module.exports = async () => {
	program
		.command("crawl")
		.description("run crawler to generate data")
		.argument("[spider]", "spider to run crawler on. if no spider is specified, it will run on all spiders.")
		.addOption(new Option("-o, --output <location>", "output location").choices(["file", "console"]).default("file"))
		.addOption(new Option("-f, --format <format>", "output format").choices(["geojson", "csv"]).default("geojson"))
		.action((spider, options) => {
			require("./commands/crawl")(spider, options);
		});

	program
		.command("generate-metadata")
		.description("generates metadata files about each geojson data file")
		.argument("[spider]", "spider to run crawler on. if no spider is specified, it will run on all spiders.")
		.addOption(new Option("-o, --output <location>", "output location").choices(["file", "console"]).default("file"))
		.action((spider, options) => {
			require("./commands/generate-metadata")(spider, options);
		});

	program
		.command("spiders list")
		.description("list the spiders")
		.action(async () => {
			const spiders = await require("./commands/spiders/list")();
			console.log(spiders.map((spider) => spider.split("/").pop()).join("\n"));
		});

	program
		.command("generate-all")
		.description("combines all data files into a single geojson data file")
		.action(async () => {
			require("./commands/generate-all")();
		})

	program.parse(process.argv);
};
