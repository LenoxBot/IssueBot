const chalk = require('chalk');

exports.run = client => {
	console.log(chalk.green(`LenoxBot IssueBot: Ready for Issues for LenoxBot`));
	setInterval(async () => {
		await client.user.setPresence({
			game: {
				name: '?createIssue | ?help',
				type: 'LISTENING'
			}
		});
	}, 3600000);
};
