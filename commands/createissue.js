const Discord = require('discord.js');
const settings = require('./../settings.json');

exports.run = async (client, msg) => {
	if (msg.guild.id !== settings.lenoxbotDiscordServer) return msg.channel.send('The bugreport must be written to the LenoxBot Discord server!');

	let botconfs;
	let userconfs;
	const userconfs = await client.userSettings.findOne({ userId: msg.author.id });

	const bugreportAnswers = [];
	const suggestionAnswers = [];

	msg.delete();

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
		if (reason === 'time') return msg.delete() && msg.reply('You didn\'t react to the message').then(m => m.delete(10000));

		botconfs = await client.botSettings.findOne({ botconfs: 'botconfs' });
		botconfs.issuescount += 1;
		await client.botSettings.updateOne({ botconfs: 'botconfs' }, { $set: { issuescount: botconfs.issuescount } });

		let messageSentToIssueJudges;
		if (typeIssue === 'bugreport') {
			for (let i = 0; i < client.bugreportQuestions.questions.length; i++) {
				try {
					const questionEmbed = new Discord.RichEmbed()
						.setTitle(client.bugreportQuestions.questions[i].question)
						.setFooter(`Min. characters: ${client.bugreportQuestions.questions[i].minChars}, Max. characters: ${client.bugreportQuestions.questions[i].maxChars}`)
						.setColor('BLUE');

					const questionMessage = await msg.reply({ embed: questionEmbed });
					const response = await msg.channel.awaitMessages(msg2 => msg2.attachments.size === 0 && msg.author.id === msg2.author.id && !msg2.author.bot && msg2.content.length <= client.bugreportQuestions.questions[i].maxChars && msg2.content.length >= client.bugreportQuestions.questions[i].minChars, {
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

			for (let index = 0; index < client.bugreportQuestions.questions.length; index++) {
				bugreportembed.addField(client.bugreportQuestions.questions[index].question, bugreportAnswers[index]);
			}


			messageSentToIssueJudges = await processingBugreportsChannel.send({
				embed: bugreportembed
			});

			const issueSent = new Discord.RichEmbed()
				.setColor('GREEN')
				.setTimestamp()
				.setTitle(`✅ Bugreport successfully sent! It will now be checked by the Issue Judgers! Thanks!`);

			msg.reply({ embed: issueSent });

			botconfs = await client.botSettings.findOne({ botconfs: 'botconfs' });
			botconfs.totalIssues.bugreports.total += 1;
			await client.botSettings.updateOne({ botconfs: 'botconfs' }, { $set: { totalIssues: botconfs.totalIssues } });

			userconfs.settings.totalIssues.bugreports.total += 1;
		} else {
			for (let i = 0; i < client.suggestionQuestions.questions.length; i++) {
				try {
					const questionEmbed = new Discord.RichEmbed()
						.setTitle(client.suggestionQuestions.questions[i].question)
						.setFooter(`Min. characters: ${client.suggestionQuestions.questions[i].minChars}, Max. characters: ${client.suggestionQuestions.questions[i].maxChars}`)
						.setColor('BLUE');

					const questionMessage = await msg.reply({ embed: questionEmbed });
					const response = await msg.channel.awaitMessages(msg2 => msg2.attachments.size === 0 && msg.author.id === msg2.author.id && !msg2.author.bot && msg2.content.length <= client.suggestionQuestions.questions[i].maxChars && msg2.content.length >= client.suggestionQuestions.questions[i].minChars, {
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

			for (let index = 0; index < client.suggestionQuestions.questions.length; index++) {
				suggestionembed.addField(client.suggestionQuestions.questions[index].question, suggestionAnswers[index]);
			}

			messageSentToIssueJudges = processingSuggestionsChannel.send({
				embed: suggestionembed
			});

			const issueSent = new Discord.RichEmbed()
				.setColor('GREEN')
				.setTitle(`✅ Suggestion successfully sent! It will now be checked by the Issue Judgers! Thanks!`);

			msg.reply({ embed: issueSent });

			botconfs = await client.botSettings.findOne({ botconfs: 'botconfs' });
			botconfs.totalIssues.suggestions.total += 1;
			await client.botSettings.updateOne({ botconfs: 'botconfs' }, { $set: { totalIssues: botconfs.totalIssues } });

			userconfs.settings.totalIssues.suggestions.total += 1;
		}

		botconfs = client.botSettings.findOne({ botconfs: 'botconfs' });
		const issueSettings = {
			reportid: botconfs.issuescount,
			messageid: messageSentToIssueJudges.id,
			authorid: msg.author.id,
			attachments: {},
			notes: {},
			approve: {},
			deny: {},
			important: 0,
			mediumimportant: 0,
			unimportant: 0,
			type: typeIssue,
			github: {
				url: String,
				id: Number
			}
		};

		botconfs = await client.botSettings.findOne({ botconfs: 'botconfs' });
		botconfs.issues[botconfs.settings.issuescount] = issueSettings
		await client.botSettings.updateOne({ botconfs: 'botconfs' }, { $set: { issues: botconfs.issues } });
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
