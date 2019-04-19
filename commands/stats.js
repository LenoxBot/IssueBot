const Discord = require('discord.js');
exports.run = async (client, msg) => {
	const user1 = msg.mentions.users.first() || msg.author;
	const userconfs = await client.userSettings.findOne({ userId: user1.id });

	if (!userconfs) return msg.reply('I couldn\'t find this user in our database!');

	const embed = new Discord.RichEmbed()
		.setColor('BLUE')
		.setTimestamp()
		.setTitle(`Stats of ${user1.tag}`)
		.addField(`Total points: ${userconfs.settings.totalPoints.bugreports + userconfs.settings.totalPoints.suggestions}`, `${userconfs.settings.totalPoints.bugreports} for bugreports \n${userconfs.settings.totalPoints.suggestions} for suggestions`)
		.addField(`Bugreports:`, `📋: ${userconfs.settings.totalIssues.bugreports.total} \n✅: ${userconfs.settings.totalIssues.bugreports.accepted} \n❌: ${userconfs.settings.totalIssues.bugreports.declined}`)
		.addField(`Suggestions:`, `📋: ${userconfs.settings.totalIssues.suggestions.total} \n✅: ${userconfs.settings.totalIssues.suggestions.accepted} \n❌: ${userconfs.settings.totalIssues.suggestions.declined}`);

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
