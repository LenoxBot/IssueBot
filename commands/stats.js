const Discord = require('discord.js');
const settings = require('./../settings.json');

exports.run = async (client, msg) => {
	if (msg.channel.id === settings.processingBugreportsChannel || msg.channel.id === settings.processingSuggestionsChannel) return;
	const user1 = msg.mentions.users.first() || msg.author;
	const userconfs = await client.userSettings.findOne({ userId: user1.id });

	if (!userconfs) return msg.reply('I couldn\'t find this user in our database!');

	const embed = new Discord.RichEmbed()
		.setColor('BLUE')
		.setTimestamp()
		.setTitle(`Stats of ${user1.tag}`)
		.addField(`Total points: ${userconfs.totalPoints.bugreports + userconfs.totalPoints.suggestions}`, `${userconfs.totalPoints.bugreports} for bugreports \n${userconfs.totalPoints.suggestions} for suggestions`)
		.addField(`Bugreports:`, `📋: ${userconfs.totalIssues.bugreports.total} \n✅: ${userconfs.totalIssues.bugreports.accepted} \n❌: ${userconfs.totalIssues.bugreports.declined}`)
		.addField(`Suggestions:`, `📋: ${userconfs.totalIssues.suggestions.total} \n✅: ${userconfs.totalIssues.suggestions.accepted} \n❌: ${userconfs.totalIssues.suggestions.declined}`);

	msg.channel.send({ embed: embed });
};

exports.conf = {
	enabled: true,
	guildOnly: true,
	aliases: [],
	userpermissions: []
};

exports.help = {
	name: 'stats',
	description: 'You can submit a new bugreport by using this command',
	usage: 'bugreport {title of the bugreport} | {description}',
	example: ['bugreport ping command bug | There is just written ping but not how many ms this message needed to send'],
	category: 'trello',
	botpermissions: ['SEND_MESSAGES']
};
