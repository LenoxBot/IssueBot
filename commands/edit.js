const Discord = require('discord.js');
const settings = require('./../settings.json');

exports.run = async (client, msg, args) => {
	const arrayOfEmojiNumbers = ['1⃣', '2⃣', '3⃣', '4⃣'];

	const input = args.slice(0, 1);
	const botconfs = await client.botSettings.findOne({ botconfs: 'botconfs' });
	const userconfs = await client.userSettings.findOne({ userId: msg.author.id });

	if (!input || input.length === 0) return msg.delete() && msg.reply('You forgot to specify the Report ID!').then(m => m.delete(10000));
	if (isNaN(input)) return msg.delete() && msg.reply('You have to enter a Report ID!').then(m => m.delete(10000));
	// delete if (args.slice(1).length === 0) return msg.delete() && msg.reply('You forgot to add information to your approve!').then(m => m.delete(10000));
	if (!botconfs.settings.issues.hasOwnProperty(input.join(' '))) return msg.delete() && msg.reply('This issue does not exist!').then(m => m.delete(10000));

	const issueconfs = botconfs.settings.issues[args.slice(0, 1).join(' ')];
	if (msg.author.id !== issueconfs.authorid) return msg.delete() && msg.reply('You can only edit your own issues!').then(m => m.delete(10000));

	if (issueconfs.type === 'bugreport') {
		const embedOfQuestions = new Discord.RichEmbed()
			.setTitle('What do you want to change?')
			.setColor('BLUE');

		const arrayOfQuestions = [];
		for (let i = 0; i < client.bugreportQuestions.questions.length; i++) {
			arrayOfQuestions.push(`${arrayOfEmojiNumbers[i]} ${client.bugreportQuestions.questions[i].question}`);
		}
		embedOfQuestions.setDescription(arrayOfQuestions.join('\n'));

		const questionsMessage = await msg.reply({ embed: embedOfQuestions });
		for (let i = 0; i < client.bugreportQuestions.questions.length; i++) {
			await questionsMessage.react(arrayOfEmojiNumbers[i]);
		}

		let reactedEmoji;
		const collector = questionsMessage.createReactionCollector((reaction, user) => user.id === msg.author.id, {
			time: 30000
		});
		collector.on('collect', r => {
			if (arrayOfEmojiNumbers.includes(r.emoji.name)) {
				reactedEmoji = r.emoji.name;
				collector.stop();
			}
		});

		collector.on('end', async (collected, reason) => {
			questionsMessage.delete();
			if (reason === 'time') return msg.reply('You didn\'t react to the message').then(m => m.delete(10000));
		});
	}
};

exports.conf = {
	enabled: true,
	guildOnly: true,
	aliases: [],
	userpermissions: []
};

exports.help = {
	name: 'edit',
	description: 'You can submit a new bugreport by using this command',
	usage: 'bugreport {title of the bugreport} | {description}',
	example: ['bugreport ping command bug | There is just written ping but not how many ms this message needed to send'],
	category: 'trello',
	botpermissions: ['SEND_MESSAGES']
};
