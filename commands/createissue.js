const Discord = require('discord.js');
const settings = require('./../settings.json');

exports.run = async (client, msg) => {
	if (msg.guild.id !== settings.lenoxbotDiscordServer) return msg.channel.send('The bugreport must be written to the LenoxBot Discord server!');

	const botconfs = await client.botSettings.findOne({ botconfs: 'botconfs' });
	const userconfs = await client.userSettings.findOne({ userId: msg.author.id });

	const bugreportAnswers = [];
	const bugreportQuestions = {
		questions: [{
			question: 'What is the title of your bugreport?',
			minChars: 15,
			maxChars: 50
		},
		{
			question: 'How can you reproduce the bug?',
			minChars: 30,
			maxChars: 300
		},
		{
			question: 'Which result would normally have to be?',
			minChars: 30,
			maxChars: 300
		}]
	};

	const suggestionAnswers = [];
	const suggestionQuestions = {
		questions: [{
			question: 'What is the title of your proposal?',
			minChars: 15,
			maxChars: 50
		},
		{
			question: 'Explain your proposal more accurately (It\'s best to give as much information as possible, so that we can implement the proposal better)',
			minChars: 30,
			maxChars: 300
		},
		{
			question: 'Why should we add this feature?',
			minChars: 30,
			maxChars: 300
		}]
	};

	let typeIssue;

	const typeMessageEmbed = new Discord.RichEmbed()
		.setDescription('What is this issue about? \n🔴 = Suggestion \n🔵 = Bugreport \n\nPlease react to the reaction that best suits this issue!')
		.setColor('BLUE');

	const typeMessage = await msg.reply({ embed: typeMessageEmbed });
	await typeMessage.react('🔴');
	await typeMessage.react('🔵');

	const collector = typeMessage.createReactionCollector((reaction, user) => user.id === msg.author.id, {
		time: 30000
	});
	collector.on('collect', r => {
		if (r.emoji.name === '🔴') {
			typeIssue = 'suggestion';
			collector.stop();
		} else {
			typeIssue = 'bugreport';
			collector.stop();
		}
	});

	collector.on('end', async (collected, reason) => {
		typeMessage.delete();
		if (reason === 'time') return msg.reply('You didn\'t react to the message').then(m => m.delete(10000));

		botconfs.settings.issuescount += 1;

		let messageSentToIssueJudges;
		if (typeIssue === 'bugreport') {
			for (let i = 0; i < bugreportQuestions.questions.length; i++) {
				try {
					const questionEmbed = new Discord.RichEmbed()
						.setTitle(bugreportQuestions.questions[i].question)
						.setFooter(`Min. characters: ${bugreportQuestions.questions[i].minChars}, Max. characters: ${bugreportQuestions.questions[i].maxChars}`)
						.setColor('BLUE');

					const questionMessage = await msg.reply({ embed: questionEmbed });
					const response = await msg.channel.awaitMessages(msg2 => msg2.attachments.size === 0 && msg.author.id === msg2.author.id && !msg2.author.bot && msg2.content.length <= bugreportQuestions.questions[i].maxChars && msg2.content.length >= bugreportQuestions.questions[i].minChars, {
						maxMatches: 1,
						time: 600000,
						errors: ['time']
					});
					bugreportAnswers.push(response.first().content);
					await response.first().delete();
					await questionMessage.delete();
				} catch (error) {
					return msg.channel.send('Bugreport was canceled because you didn\'t answer after 10 minutes');
				}
			}

			const processingBugreportsChannel = client.channels.get(settings.processingBugreportsChannel);
			const bugreportembed = new Discord.RichEmbed()
				.setColor('BLUE')
				.setTitle(`📢 Bug reported by ${msg.author.username} (${msg.author.id})`)
				.setDescription(`This bugreport needs to be approved/declined. \n**🆔: ${botconfs.settings.issuescount}**`);

			for (let index = 0; index < bugreportQuestions.questions.length; index++) {
				bugreportembed.addField(bugreportQuestions.questions[index].question, bugreportAnswers[index]);
			}


			messageSentToIssueJudges = await processingBugreportsChannel.send({
				embed: bugreportembed
			});

			const issueSent = new Discord.RichEmbed()
				.setColor('GREEN')
				.setTimestamp()
				.setTitle(`🆕 Bugreport successfully sent! It will now be checked by the Issue Judgers! Thanks!`);

			msg.reply({ embed: issueSent });

			botconfs.settings.totalIssues.bugreports.total += 1;
			userconfs.settings.totalIssues.bugreports.total += 1;
		} else {
			for (let i = 0; i < suggestionQuestions.questions.length; i++) {
				try {
					const questionEmbed = new Discord.RichEmbed()
						.setTitle(suggestionQuestions.questions[i].question)
						.setFooter(`Min. characters: ${suggestionQuestions.questions[i].minChars}, Max. characters: ${suggestionQuestions.questions[i].maxChars}`)
						.setColor('BLUE');

					const questionMessage = await msg.reply({ embed: questionEmbed });
					const response = await msg.channel.awaitMessages(msg2 => msg2.attachments.size === 0 && msg.author.id === msg2.author.id && !msg2.author.bot && msg2.content.length <= suggestionQuestions.questions[i].maxChars && msg2.content.length >= suggestionQuestions.questions[i].minChars, {
						maxMatches: 1,
						time: 600000,
						errors: ['time']
					});
					suggestionAnswers.push(response.first().content);
					await response.first().delete();
					await questionMessage.delete();
				} catch (error) {
					return msg.channel.send('Suggestion was canceled because you didn\'t answer after 10 minutes');
				}
			}

			const processingSuggestionsChannel = client.channels.get(settings.processingSuggestionsChannel);
			const suggestionembed = new Discord.RichEmbed()
				.setColor('BLUE')
				.setTitle(`📢 Suggestion proposed by ${msg.author.username} (${msg.author.id})`)
				.setDescription(`This suggestion needs to be approved/declined. \n**🆔: ${botconfs.settings.issuescount}**`);

			for (let index = 0; index < suggestionQuestions.questions.length; index++) {
				suggestionembed.addField(suggestionQuestions.questions[index].question, suggestionAnswers[index]);
			}

			messageSentToIssueJudges = await processingSuggestionsChannel.send({
				embed: suggestionembed
			});

			const issueSent = new Discord.RichEmbed()
				.setColor('GREEN')
				.setTitle(`🆕 Suggestion successfully sent! It will now be checked by the Issue Judgers! Thanks!`);

			msg.reply({ embed: issueSent });

			botconfs.settings.totalIssues.suggestions.total += 1;
			userconfs.settings.totalIssues.suggestions.total += 1;
		}

		const issueSettings = {
			reportid: botconfs.settings.issuescount,
			messageid: messageSentToIssueJudges.id,
			authorid: msg.author.id,
			attachments: {},
			notes: {},
			approve: {},
			deny: {},
			important: 0,
			mediumimportant: 0,
			unimportant: 0,
			type: typeIssue
		};

		botconfs.settings.issues[botconfs.settings.issuescount] = issueSettings;

		await client.botSettings.updateOne({ botconfs: 'botconfs' }, { $set: { settings: botconfs.settings } });
		await client.userSettings.updateOne({ userId: msg.author.id }, { $set: { settings: userconfs.settings } });
	});
};

exports.conf = {
	enabled: true,
	guildOnly: true,
	aliases: [],
	userpermissions: []
};

exports.help = {
	name: 'createissue',
	description: 'You can submit a new bugreport by using this command',
	usage: 'bugreport {title of the bugreport} | {description}',
	example: ['bugreport ping command bug | There is just written ping but not how many ms this message needed to send'],
	category: 'trello',
	botpermissions: ['SEND_MESSAGES']
};
