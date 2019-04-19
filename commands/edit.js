const Discord = require('discord.js');
const settings = require('./../settings.json');

exports.run = async (client, msg, args) => {
	const arrayOfEmojiNumbers = ['1⃣', '2⃣', '3⃣', '4⃣'];

	const input = args.slice(0, 1);
	const botconfs = await client.botSettings.findOne({ botconfs: 'botconfs' });

	if (!input || input.length === 0) return msg.delete() && msg.reply('You forgot to specify the Report ID!').then(m => m.delete(10000));
	if (isNaN(input)) return msg.delete() && msg.reply('You have to enter a Report ID!').then(m => m.delete(10000));
	// delete if (args.slice(1).length === 0) return msg.delete() && msg.reply('You forgot to add information to your approve!').then(m => m.delete(10000));
	if (!botconfs.settings.issues.hasOwnProperty(input.join(' '))) return msg.delete() && msg.reply('This issue does not exist!').then(m => m.delete(10000));

	const issueconfs = botconfs.settings.issues[args.slice(0, 1).join(' ')];
	if ((Object.keys(issueconfs.approve).length + Object.keys(issueconfs.deny).length) !== 0) return msg.delete() && msg.reply('You can\'t edit a question that has already been approved or denied!').then(m => m.delete(10000));
	if (msg.author.id !== issueconfs.authorid) return msg.delete() && msg.reply('You can only edit your own issues!').then(m => m.delete(10000));

	msg.delete();

	if (issueconfs.type === 'bugreport') {
		const embedOfQuestions = new Discord.RichEmbed()
			.setTitle('Which question do you want to edit?')
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
		let newAnswer;
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
			if (reason === 'time') return msg.delete() && msg.reply('You didn\'t react to the message').then(m => m.delete(10000));

			let fetchedmessage;
			try {
				fetchedmessage = await client.channels.get(settings.processingBugreportsChannel).fetchMessage(issueconfs.messageid);
			} catch (error) {
				return msg.delete() && msg.reply('This bugreport doesn\'t exist anymore!').then(m => m.delete(10000));
			}

			const reactedNumberIndex = arrayOfEmojiNumbers.indexOf(reactedEmoji);

			let currentAnswer;
			for (let i = 0; i < fetchedmessage.embeds[0].fields.length; i++) {
				if (fetchedmessage.embeds[0].fields[i].name === client.suggestionQuestions.questions[reactedNumberIndex].question) {
					currentAnswer = fetchedmessage.embeds[0].fields[i].value;
				}
			}

			const questionEmbed = new Discord.RichEmbed()
				.setColor('BLUE')
				.setTitle('Please answer again to this question to edit your issue')
				.setDescription(client.bugreportQuestions.questions[reactedNumberIndex].question)
				.addField('Your current answer is:', currentAnswer)
				.setFooter(`Min. characters: ${client.suggestionQuestions.questions[reactedNumberIndex].minChars}, Max. characters: ${client.suggestionQuestions.questions[reactedNumberIndex].maxChars}`);

			try {
				const questionMessage = await msg.reply({ embed: questionEmbed });
				const response = await msg.channel.awaitMessages(msg2 => msg2.attachments.size === 0 && msg.author.id === msg2.author.id && !msg2.author.bot && msg2.content.length <= client.suggestionQuestions.questions[reactedNumberIndex].maxChars && msg2.content.length >= client.suggestionQuestions.questions[reactedNumberIndex].minChars, {
					maxMatches: 1,
					time: 600000,
					errors: ['time']
				});
				newAnswer = response.first().content;
				await response.first().delete();
				await questionMessage.delete();
			} catch (error) {
				return msg.channel.send('Edit was canceled because you didn\'t answer after 10 minutes');
			}

			const bugreportEmbed = new Discord.RichEmbed()
				.setTitle(fetchedmessage.embeds[0].title)
				.setDescription(fetchedmessage.embeds[0].description)
				.setColor('BLUE');

			for (let i = 0; i < fetchedmessage.embeds[0].fields.length; i++) {
				if (fetchedmessage.embeds[0].fields[i].name === client.bugreportQuestions.questions[reactedNumberIndex].question) {
					bugreportEmbed.addField(fetchedmessage.embeds[0].fields[i].name, newAnswer);
				} else {
					bugreportEmbed.addField(fetchedmessage.embeds[0].fields[i].name, fetchedmessage.embeds[0].fields[i].value);
				}
			}

			await fetchedmessage.edit({
				embed: bugreportEmbed
			});

			const editedEmbed = new Discord.RichEmbed()
				.setColor('GREEN')
				.setTitle(`✅ Edited successfully your issue (🆔: ${issueconfs.reportid})!`);
			msg.reply({ embed: editedEmbed });
		});
	} else {
		const embedOfQuestions = new Discord.RichEmbed()
			.setTitle('Which question do you want to edit?')
			.setColor('BLUE');

		const arrayOfQuestions = [];
		for (let i = 0; i < client.suggestionQuestions.questions.length; i++) {
			arrayOfQuestions.push(`${arrayOfEmojiNumbers[i]} ${client.suggestionQuestions.questions[i].question}`);
		}
		embedOfQuestions.setDescription(arrayOfQuestions.join('\n'));

		const questionsMessage = await msg.reply({ embed: embedOfQuestions });
		for (let i = 0; i < client.suggestionQuestions.questions.length; i++) {
			await questionsMessage.react(arrayOfEmojiNumbers[i]);
		}

		let reactedEmoji;
		let newAnswer;
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
			if (reason === 'time') return msg.delete() && msg.reply('You didn\'t react to the message').then(m => m.delete(10000));

			let fetchedmessage;
			try {
				fetchedmessage = await client.channels.get(settings.processingSuggestionsChannel).fetchMessage(issueconfs.messageid);
			} catch (error) {
				return msg.delete() && msg.reply('This suggestion doesn\'t exist anymore!').then(m => m.delete(10000));
			}

			const reactedNumberIndex = arrayOfEmojiNumbers.indexOf(reactedEmoji);

			let currentAnswer;
			for (let i = 0; i < fetchedmessage.embeds[0].fields.length; i++) {
				if (fetchedmessage.embeds[0].fields[i].name === client.suggestionQuestions.questions[reactedNumberIndex].question) {
					currentAnswer = fetchedmessage.embeds[0].fields[i].value;
				}
			}

			const questionEmbed = new Discord.RichEmbed()
				.setColor('BLUE')
				.setTitle('Please answer again to this question to edit your issue')
				.setDescription(client.suggestionQuestions.questions[reactedNumberIndex].question)
				.addField('Your current answer is:', currentAnswer)
				.setFooter(`Min. characters: ${client.suggestionQuestions.questions[reactedNumberIndex].minChars}, Max. characters: ${client.suggestionQuestions.questions[reactedNumberIndex].maxChars}`);

			try {
				const questionMessage = await msg.reply({ embed: questionEmbed });
				const response = await msg.channel.awaitMessages(msg2 => msg2.attachments.size === 0 && msg.author.id === msg2.author.id && !msg2.author.bot && msg2.content.length <= client.suggestionQuestions.questions[reactedNumberIndex].maxChars && msg2.content.length >= client.suggestionQuestions.questions[reactedNumberIndex].minChars, {
					maxMatches: 1,
					time: 600000,
					errors: ['time']
				});
				newAnswer = response.first().content;
				await response.first().delete();
				await questionMessage.delete();
			} catch (error) {
				return msg.channel.send('Edit was canceled because you didn\'t answer after 10 minutes');
			}

			const suggestionEmbed = new Discord.RichEmbed()
				.setTitle(fetchedmessage.embeds[0].title)
				.setDescription(fetchedmessage.embeds[0].description)
				.setColor('BLUE');

			for (let i = 0; i < fetchedmessage.embeds[0].fields.length; i++) {
				if (fetchedmessage.embeds[0].fields[i].name === client.suggestionQuestions.questions[reactedNumberIndex].question) {
					suggestionEmbed.addField(fetchedmessage.embeds[0].fields[i].name, newAnswer);
				} else {
					suggestionEmbed.addField(fetchedmessage.embeds[0].fields[i].name, fetchedmessage.embeds[0].fields[i].value);
				}
			}

			await fetchedmessage.edit({
				embed: suggestionEmbed
			});

			const editedEmbed = new Discord.RichEmbed()
				.setColor('GREEN')
				.setTitle(`✅ Edited successfully your issue (🆔: ${issueconfs.reportid})!`);
			msg.reply({ embed: editedEmbed });
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
