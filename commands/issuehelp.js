const Discord = require('discord.js');
const settings = require('./../settings.json');

exports.run = async (client, msg) => {
	if (msg.channel.id === settings.processingBugreportsChannel || msg.channel.id === settings.processingSuggestionsChannel) return;

	const helpEmbed = new Discord.RichEmbed()
		.setColor('BLUE')
		.setTitle('IssueBot Commands');

	const nonIssueJudgerCommands = [];
	const issueJudgerCommands = [];
	const issueJudgerAdminCommands = [];

	for (const index of client.commands) {
		if (index[1].conf.issuejudger) {
			issueJudgerCommands.push(index[1]);
		} else if (index[1].conf.issuejudgeradmin) {
			issueJudgerAdminCommands.push(index[1]);
		} else {
			nonIssueJudgerCommands.push(index[1]);
		}
	}

	helpEmbed.addField('📌 Standard commands:', nonIssueJudgerCommands.map(r => `\`?${r.help.name}\` : ${r.help.description}`));
	helpEmbed.addField('🛠 IssueJudger commands:', issueJudgerCommands.map(r => `\`?${r.help.name}\` : ${r.help.description}`));
	helpEmbed.addField('⚙ IssueJudgerAdmins commands:', issueJudgerAdminCommands.map(r => `\`?${r.help.name}\` : ${r.help.description}`));

	return msg.channel.send({
		embed: helpEmbed
	});
};

exports.conf = {
	enabled: true,
	guildOnly: true,
	aliases: [],
	userpermissions: []
};

exports.help = {
	name: 'issuehelp',
	description: 'List of all commands',
	usage: 'bugreport {title of the bugreport} | {description}',
	example: ['bugreport ping command bug | There is just written ping but not how many ms this message needed to send'],
	category: 'trello',
	botpermissions: ['SEND_MESSAGES']
};
