const { program, Option } = require("commander");

module.exports = async () => {
	program
		.command("crawl")
		.description("run crawler to generate data")
		.argument("[spider]", "spider to run crawler on. if no spider is specified, it will run on all spiders.")
		.addOption(new Option("-o, --output <type>", "output type").choices(["file", "console"]).default("file"))
		.action((spider, options) => {
			require("./commands/crawl")(spider, options);
		});

	program
		.command("spiders list")
		.description("list the spiders")
		.action(async () => {
			const spiders = await require("./commands/spiders/list")();
			console.log(spiders.join("\n"));
		});

	program.parse(process.argv);
};
