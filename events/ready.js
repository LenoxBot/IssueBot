const chalk = require('chalk');

exports.run = async client => {
	console.log(chalk.green(`LenoxBot IssueBot: Ready for Issues for LenoxBot`));
	await client.user.setPresence({
		game: {
			name: '?createIssue',
			type: 'LISTENING'
		}
	});
};
