exports.run = async client => {
	console.log(`LenoxBot IssueBot: Ready for Issues for LenoxBot`);
	await client.user.setPresence({
		game: {
			name: '?createIssue',
			type: 'LISTENING'
		}
	});
};
