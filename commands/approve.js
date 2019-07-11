const Discord = require('discord.js');
const settings = require('./../settings.json');
const axios = require('axios');

exports.run = async (client, msg, args) => {
	if (msg.channel.id !== settings.processingBugreportsChannel && msg.channel.id !== settings.processingSuggestionsChannel) return;

	const input = args.slice(0, 1);
	let botconfs;
	let userconfs;

	if (!input || input.length === 0) return msg.delete() && msg.reply('You forgot to specify the Report ID!').then(m => m.delete(10000));
	if (isNaN(input)) return msg.delete() && msg.reply('You have to enter a Report ID!').then(m => m.delete(10000));
	if (args.slice(1).length === 0) return msg.delete() && msg.reply('You forgot to add information to your approve!').then(m => m.delete(10000));
	if (msg.attachments.size !== 0) return msg.delete() && msg.reply('You are not allowed to add screenshots to an approve!').then(m => m.delete(10000));

	botconfs = await client.botSettings.findOne({ botconfs: 'botconfs' });
	if (!botconfs.issues.hasOwnProperty(input.join(' '))) return msg.delete() && msg.reply('This issue does not exist!').then(m => m.delete(10000));

	// Bugreports channel:
	if (msg.channel.id === settings.processingBugreportsChannel) {
		if (msg.author.id === botconfs.issues[args.slice(0, 1).join(' ')].authorid) return msg.delete() && msg.reply('You can\'t approve your own bugreport!').then(m => m.delete(10000));

		if (botconfs.issues[args.slice(0, 1).join(' ')].approve.hasOwnProperty(msg.author.id)) return msg.delete() && msg.reply('You have already approved this bugreport!').then(m => m.delete(10000));
		if (botconfs.issues[args.slice(0, 1).join(' ')].deny.hasOwnProperty(msg.author.id)) return msg.delete() && msg.reply('You have already declined this bugreport!').then(m => m.delete(10000));

		let fetchedmessage;
		try {
			fetchedmessage = await client.channels.get(settings.processingBugreportsChannel).fetchMessage(botconfs.issues[args.slice(0, 1).join(' ')].messageid);
		} catch (error) {
			return msg.delete() && msg.reply('This bugreport doesn\'t exist anymore!').then(m => m.delete(10000));
		}

		if (args.slice(1).join(' ').length > 100) return msg.delete() && msg.reply('Your approve text has to have a maximum of 100 characters!').then(m => m.delete(10000));

		const priorityEmbed = new Discord.RichEmbed()
			.setDescription('Which priority do you think best fits this bugreport? \n🔴 = priority high \n🔵 = priority medium \n⚫ = priority low \n\nPlease react to the reaction that best suits this bugreport!')
			.setColor('BLUE');

		const message = await msg.reply({ embed: priorityEmbed });
		await message.react('🔴');
		await message.react('🔵');
		await message.react('⚫');

		const collector = message.createReactionCollector((reaction, user) => user.id === msg.author.id, {
			time: 30000
		});
		collector.on('collect', async r => {
			if (r.emoji.name === '🔴') {
				botconfs = await client.botSettings.findOne({ botconfs: 'botconfs' });
				botconfs.issues[args.slice(0, 1).join(' ')].important += 1;
				await client.botSettings.updateOne({ botconfs: 'botconfs' }, { $set: { issues: botconfs.issues } });

				collector.stop();
			} else if (r.emoji.name === '🔵') {
				botconfs = await client.botSettings.findOne({ botconfs: 'botconfs' });
				botconfs.issues[args.slice(0, 1).join(' ')].mediumimportant += 1;
				await client.botSettings.updateOne({ botconfs: 'botconfs' }, { $set: { issues: botconfs.issues } });

				collector.stop();
			} else if (r.emoji.name === '⚫') {
				botconfs = await client.botSettings.findOne({ botconfs: 'botconfs' });
				botconfs.issues[args.slice(0, 1).join(' ')].unimportant += 1;
				await client.botSettings.updateOne({ botconfs: 'botconfs' }, { $set: { issues: botconfs.issues } });

				collector.stop();
			}
		});

		collector.on('end', async (collected, reason) => {
			message.delete();
			if (reason === 'time') return msg.delete() && msg.reply('You didn\'t react to the message').then(m => m.delete(10000));

			botconfs = await client.botSettings.findOne({ botconfs: 'botconfs' });
			botconfs.issues[args.slice(0, 1).join(' ')].approve[msg.author.id] = args.slice(1).join(' ');
			await client.botSettings.updateOne({ botconfs: 'botconfs' }, { $set: { issues: botconfs.issues } });

			if ((Object.keys(botconfs.issues[args.slice(0, 1).join(' ')].deny).length + Object.keys(botconfs.issues[args.slice(0, 1).join(' ')].approve).length + Object.keys(botconfs.issues[args.slice(0, 1).join(' ')].attachments).length + Object.keys(botconfs.issues[args.slice(0, 1).join(' ')].notes).length - 1) === 0) {
				const newField = `✅ **${msg.author.username}:** ${args.slice(1).join(' ')}`;
				const bugreportEmbed = new Discord.RichEmbed()
					.setTitle(fetchedmessage.embeds[0].title)
					.setDescription(fetchedmessage.embeds[0].description)
					.setColor('BLUE');

				for (let i = 0; i < fetchedmessage.embeds[0].fields.length; i++) {
					bugreportEmbed.addField(fetchedmessage.embeds[0].fields[i].name, fetchedmessage.embeds[0].fields[i].value);
				}

				bugreportEmbed.addField(`Comments:`, newField);

				await fetchedmessage.edit({
					embed: bugreportEmbed
				});
			} else {
				const newField = `✅ **${msg.author.username}:** ${args.slice(1).join(' ')}`;
				const bugreportEmbed = new Discord.RichEmbed()
					.setTitle(fetchedmessage.embeds[0].title)
					.setDescription(fetchedmessage.embeds[0].description)
					.setColor('BLUE');

				for (let i = 0; i < fetchedmessage.embeds[0].fields.length; i++) {
					if (fetchedmessage.embeds[0].fields[i].name === 'Comments:') {
						bugreportEmbed.addField(fetchedmessage.embeds[0].fields[i].name, `${fetchedmessage.embeds[0].fields[i].value} \n${newField}`);
					} else {
						bugreportEmbed.addField(fetchedmessage.embeds[0].fields[i].name, fetchedmessage.embeds[0].fields[i].value);
					}
				}

				await fetchedmessage.edit({
					embed: bugreportEmbed
				});
			}

			await msg.reply('The report was approved successfully!').then(m => m.delete(10000));

			if (Object.keys(botconfs.issues[args.slice(0, 1).join(' ')].approve).length >= 3) {
				await axios.post('https://lenoxbot.com/api/newacceptedissue', {
					authorization: settings.authForAPI,
					userId: botconfs.issues[args.slice(0, 1).join(' ')].authorid,
					credits: 200
				}).catch(error => {
					console.error(error);
				});

				msg.guild.members.get(botconfs.issues[args.slice(0, 1).join(' ')].authorid).send(`Thank you for your **bugreport**! Your bugreport **"${fetchedmessage.embeds[0].fields[0].value}"** has been accepted and will be processed as soon as possible. As a thank, you got 200 credits! (🆔: ${botconfs.issues[args.slice(0, 1).join(' ')].reportid})`);

				const newContent = fetchedmessage.embeds[0].description.replace('This bugreport needs to be approved/declined.', '');

				const newTitle = fetchedmessage.embeds[0].title.replace('📢', '✅');
				const newEmbed = new Discord.RichEmbed()
					.setTitle(newTitle)
					.setColor('GREEN')
					.setDescription(newContent);

				for (let i = 0; i < fetchedmessage.embeds[0].fields.length; i++) {
					newEmbed.addField(fetchedmessage.embeds[0].fields[i].name, fetchedmessage.embeds[0].fields[i].value);
				}

				const GitHubIssue = {};

				GitHubIssue.title = fetchedmessage.embeds[0].fields[0].value;
				GitHubIssue.body = `${fetchedmessage.embeds[0].title}`;

				for (let i = 0; i < fetchedmessage.embeds[0].fields.length; i++) {
					GitHubIssue.body += `\n\n**${fetchedmessage.embeds[0].fields[i].name}** \n${fetchedmessage.embeds[0].fields[i].value}`;
				}

				GitHubIssue.labels = ['t: bugreport'];

				if (botconfs.issues[args.slice(0, 1).join(' ')].important >= 2) {
					GitHubIssue.labels.push('p: high');
				} else if (botconfs.issues[args.slice(0, 1).join(' ')].mediumimportant >= 2) {
					GitHubIssue.labels.push('p: medium');
				} else {
					GitHubIssue.labels.push('p: low');
				}

				if (botconfs.issues[args.slice(0, 1).join(' ')].category) {
					if (botconfs.issues[args.slice(0, 1).join(' ')].category === 'website') {
						GitHubIssue.labels.push('meta: website');
					}

					if (botconfs.issues[args.slice(0, 1).join(' ')].category === 'lenoxbot') {
						GitHubIssue.labels.push('meta: bot');
					}
				}

				let createdIssue;
				let LenoxBotIssues;
				if (botconfs.issues[args.slice(0, 1).join(' ')].category && botconfs.issues[args.slice(0, 1).join(' ')].category === 'issuebot') {
					LenoxBotIssues = await client.GitHub.getIssues('LenoxBot', 'IssueBot');
					createdIssue = await LenoxBotIssues.createIssue(GitHubIssue);
				} else if (botconfs.issues[args.slice(0, 1).join(' ')].category && botconfs.issues[args.slice(0, 1).join(' ')].category === 'documentation') {
					LenoxBotIssues = await client.GitHub.getIssues('LenoxBot', 'LenoxBot-Docs');
					createdIssue = await LenoxBotIssues.createIssue(GitHubIssue);
				} else {
					LenoxBotIssues = await client.GitHub.getIssues('LenoxBot', 'LenoxBot');
					createdIssue = await LenoxBotIssues.createIssue(GitHubIssue);
				}

				newEmbed.setURL(createdIssue.data.html_url);

				msg.guild.channels.get(settings.approvedBugreportsChannel).send({
					embed: newEmbed
				});
				fetchedmessage.delete();

				botconfs = await client.botSettings.findOne({ botconfs: 'botconfs' });
				botconfs.issues[args.slice(0, 1).join(' ')].github.url = createdIssue.data.html_url;
				botconfs.issues[args.slice(0, 1).join(' ')].github.id = createdIssue.data.id;
				await client.botSettings.updateOne({ botconfs: 'botconfs' }, { $set: { issues: botconfs.issues } });

				botconfs = await client.botSettings.findOne({ botconfs: 'botconfs' });
				botconfs.totalIssues.bugreports.accepted += 1;
				await client.botSettings.updateOne({ botconfs: 'botconfs' }, { $set: { totalIssues: botconfs.totalIssues } });

				userconfs = await client.userSettings.findOne({ userId: botconfs.issues[args.slice(0, 1).join(' ')].authorid });
				userconfs.totalIssues.bugreports.accepted += 1;
				await client.userSettings.updateOne({ userId: botconfs.issues[args.slice(0, 1).join(' ')].authorid }, { $set: { totalIssues: userconfs.totalIssues } });

				userconfs = await client.userSettings.findOne({ userId: botconfs.issues[args.slice(0, 1).join(' ')].authorid });
				userconfs.totalPoints.bugreports += 5;
				await client.userSettings.updateOne({ userId: botconfs.issues[args.slice(0, 1).join(' ')].authorid }, { $set: { totalPoints: userconfs.totalPoints } });

				if (!msg.guild.members.get(botconfs.issues[args.slice(0, 1).join(' ')].authorid).roles.has(msg.guild.roles.find(r => r.name.toLowerCase() === 'issue judger').id) && ((userconfs.totalPoints.suggestions + userconfs.totalPoints.bugreports) >= 50)) {
					await msg.guild.members.get(botconfs.issues[args.slice(0, 1).join(' ')].authorid).addRole(msg.guild.roles.find(r => r.name.toLowerCase() === 'issue judger'));
					msg.guild.channels.get(settings.issueJudgersChannel).send(`${msg.guild.members.get(botconfs.issues[args.slice(0, 1).join(' ')].authorid)}, Welcome to the Issue Judgers! Please read the messages pinned in the channel here for an introduction!`);
				}
			}

			msg.delete();
		});
	} else {
		if (msg.author.id === botconfs.issues[args.slice(0, 1).join(' ')].authorid) return msg.delete() && msg.reply('You can\'t approve your own suggestion!').then(m => m.delete(10000));

		if (botconfs.issues[args.slice(0, 1).join(' ')].approve.hasOwnProperty(msg.author.id)) return msg.delete() && msg.reply('You have already approved this suggestion!').then(m => m.delete(10000));
		if (botconfs.issues[args.slice(0, 1).join(' ')].deny.hasOwnProperty(msg.author.id)) return msg.delete() && msg.reply('You have already declined this suggestion!').then(m => m.delete(10000));

		let fetchedmessage;
		try {
			fetchedmessage = await client.channels.get(settings.processingSuggestionsChannel).fetchMessage(botconfs.issues[args.slice(0, 1).join(' ')].messageid);
		} catch (error) {
			return msg.delete() && msg.reply('This suggestion doesn\'t exist anymore!').then(m => m.delete(10000));
		}

		if (args.slice(1).join(' ').length > 100) return msg.delete() && msg.reply('Your approve text has to have a maxium of 100 characters!').then(m => m.delete(10000));

		const priorityEmbed = new Discord.RichEmbed()
			.setDescription('Which priority do you think best fits this suggestion? \n🔴 = priority high \n🔵 = priority medium \n⚫ = priority low \n\nPlease react to the reaction that best suits this suggestion!')
			.setColor('BLUE');

		const message = await msg.reply({ embed: priorityEmbed });
		await message.react('🔴');
		await message.react('🔵');
		await message.react('⚫');

		const collector = message.createReactionCollector((reaction, user) => user.id === msg.author.id, {
			time: 30000
		});
		collector.on('collect', async r => {
			if (r.emoji.name === '🔴') {
				botconfs = await client.botSettings.findOne({ botconfs: 'botconfs' });
				botconfs.issues[args.slice(0, 1).join(' ')].important += 1;
				await client.botSettings.updateOne({ botconfs: 'botconfs' }, { $set: { issues: botconfs.issues } });

				collector.stop();
			} else if (r.emoji.name === '🔵') {
				botconfs = await client.botSettings.findOne({ botconfs: 'botconfs' });
				botconfs.issues[args.slice(0, 1).join(' ')].mediumimportant += 1;
				await client.botSettings.updateOne({ botconfs: 'botconfs' }, { $set: { issues: botconfs.issues } });

				collector.stop();
			} else if (r.emoji.name === '⚫') {
				botconfs = await client.botSettings.findOne({ botconfs: 'botconfs' });
				botconfs.issues[args.slice(0, 1).join(' ')].unimportant += 1;
				await client.botSettings.updateOne({ botconfs: 'botconfs' }, { $set: { issues: botconfs.issues } });

				collector.stop();
			}
		});

		collector.on('end', async (collected, reason) => {
			message.delete();
			if (reason === 'time') return msg.delete() && msg.reply('You didn\'t react to the message').then(m => m.delete(10000));

			botconfs = await client.botSettings.findOne({ botconfs: 'botconfs' });
			botconfs.issues[args.slice(0, 1).join(' ')].approve[msg.author.id] = args.slice(1).join(' ');
			await client.botSettings.updateOne({ botconfs: 'botconfs' }, { $set: { issues: botconfs.issues } });

			if ((Object.keys(botconfs.issues[args.slice(0, 1).join(' ')].deny).length + Object.keys(botconfs.issues[args.slice(0, 1).join(' ')].approve).length + Object.keys(botconfs.issues[args.slice(0, 1).join(' ')].attachments).length + Object.keys(botconfs.issues[args.slice(0, 1).join(' ')].notes).length - 1) === 0) {
				const newField = `✅ **${msg.author.username}:** ${args.slice(1).join(' ')}`;
				const suggestionEmbed = new Discord.RichEmbed()
					.setTitle(fetchedmessage.embeds[0].title)
					.setDescription(fetchedmessage.embeds[0].description)
					.setColor('BLUE');

				for (let i = 0; i < fetchedmessage.embeds[0].fields.length; i++) {
					suggestionEmbed.addField(fetchedmessage.embeds[0].fields[i].name, fetchedmessage.embeds[0].fields[i].value);
				}

				suggestionEmbed.addField(`Comments:`, newField);

				await fetchedmessage.edit({
					embed: suggestionEmbed
				});
			} else {
				const newField = `✅ **${msg.author.username}:** ${args.slice(1).join(' ')}`;
				const suggestionEmbed = new Discord.RichEmbed()
					.setTitle(fetchedmessage.embeds[0].title)
					.setDescription(fetchedmessage.embeds[0].description)
					.setColor('BLUE');

				for (let i = 0; i < fetchedmessage.embeds[0].fields.length; i++) {
					if (fetchedmessage.embeds[0].fields[i].name === 'Comments:') {
						suggestionEmbed.addField(fetchedmessage.embeds[0].fields[i].name, `${fetchedmessage.embeds[0].fields[i].value} \n${newField}`);
					} else {
						suggestionEmbed.addField(fetchedmessage.embeds[0].fields[i].name, fetchedmessage.embeds[0].fields[i].value);
					}
				}

				await fetchedmessage.edit({
					embed: suggestionEmbed
				});
			}

			await msg.reply('The report was approved successfully!').then(m => m.delete(10000));

			if (Object.keys(botconfs.issues[args.slice(0, 1).join(' ')].approve).length >= 3) {
				await axios.post('https://lenoxbot.com/api/newacceptedissue', {
					authorization: settings.authForAPI,
					userId: botconfs.issues[args.slice(0, 1).join(' ')].authorid,
					credits: 200
				}).catch(error => {
					console.error(error);
				});

				msg.guild.members.get(botconfs.issues[args.slice(0, 1).join(' ')].authorid).send(`Thank you for your **suggestion**! Your suggestion **"${fetchedmessage.embeds[0].fields[0].value}"** has been accepted and will be processed as soon as possible. As a thank, you got 200 credits! (🆔: ${botconfs.issues[args.slice(0, 1).join(' ')].reportid})`);

				const newContent = fetchedmessage.embeds[0].description.replace('This suggestion needs to be approved/declined.', '');

				const newTitle = fetchedmessage.embeds[0].title.replace('📢', '✅');
				const newEmbed = new Discord.RichEmbed()
					.setTitle(newTitle)
					.setColor('GREEN')
					.setDescription(newContent);

				for (let i = 0; i < fetchedmessage.embeds[0].fields.length; i++) {
					newEmbed.addField(fetchedmessage.embeds[0].fields[i].name, fetchedmessage.embeds[0].fields[i].value);
				}

				const GitHubIssue = {};

				GitHubIssue.title = fetchedmessage.embeds[0].fields[0].value;
				GitHubIssue.body = `${fetchedmessage.embeds[0].title}`;

				for (let i = 0; i < fetchedmessage.embeds[0].fields.length; i++) {
					GitHubIssue.body += `\n\n**${fetchedmessage.embeds[0].fields[i].name}** \n${fetchedmessage.embeds[0].fields[i].value}`;
				}

				GitHubIssue.labels = ['t: enhancement'];

				if (botconfs.issues[args.slice(0, 1).join(' ')].important >= 2) {
					GitHubIssue.labels.push('p: high');
				} else if (botconfs.issues[args.slice(0, 1).join(' ')].mediumimportant >= 2) {
					GitHubIssue.labels.push('p: medium');
				} else {
					GitHubIssue.labels.push('p: low');
				}

				if (botconfs.issues[args.slice(0, 1).join(' ')].category) {
					if (botconfs.issues[args.slice(0, 1).join(' ')].category === 'website') {
						GitHubIssue.labels.push('meta: website');
					}

					if (botconfs.issues[args.slice(0, 1).join(' ')].category === 'lenoxbot') {
						GitHubIssue.labels.push('meta: bot');
					}
				}

				let createdIssue;
				let LenoxBotIssues;
				if (botconfs.issues[args.slice(0, 1).join(' ')].category && botconfs.issues[args.slice(0, 1).join(' ')].category === 'issuebot') {
					LenoxBotIssues = await client.GitHub.getIssues('LenoxBot', 'IssueBot');
					createdIssue = await LenoxBotIssues.createIssue(GitHubIssue);
				} else if (botconfs.issues[args.slice(0, 1).join(' ')].category && botconfs.issues[args.slice(0, 1).join(' ')].category === 'documentation') {
					LenoxBotIssues = await client.GitHub.getIssues('LenoxBot', 'LenoxBot-Docs');
					createdIssue = await LenoxBotIssues.createIssue(GitHubIssue);
				} else {
					LenoxBotIssues = await client.GitHub.getIssues('LenoxBot', 'LenoxBot');
					createdIssue = await LenoxBotIssues.createIssue(GitHubIssue);
				}

				newEmbed.setURL(createdIssue.data.html_url);

				msg.guild.channels.get(settings.approvedSuggestionsChannel).send({
					embed: newEmbed
				});
				fetchedmessage.delete();

				botconfs = await client.botSettings.findOne({ botconfs: 'botconfs' });
				botconfs.issues[args.slice(0, 1).join(' ')].github.url = createdIssue.data.html_url;
				botconfs.issues[args.slice(0, 1).join(' ')].github.id = createdIssue.data.id;
				await client.botSettings.updateOne({ botconfs: 'botconfs' }, { $set: { issues: botconfs.issues } });

				botconfs = await client.botSettings.findOne({ botconfs: 'botconfs' });
				botconfs.totalIssues.suggestions.accepted += 1;
				await client.botSettings.updateOne({ botconfs: 'botconfs' }, { $set: { totalIssues: botconfs.totalIssues } });

				userconfs = await client.userSettings.findOne({ userId: botconfs.issues[args.slice(0, 1).join(' ')].authorid });
				userconfs.totalIssues.suggestions.accepted += 1;
				await client.userSettings.updateOne({ userId: botconfs.issues[args.slice(0, 1).join(' ')].authorid }, { $set: { totalIssues: userconfs.totalIssues } });

				userconfs = await client.userSettings.findOne({ userId: botconfs.issues[args.slice(0, 1).join(' ')].authorid });
				userconfs.totalPoints.suggestions += 5;
				await client.userSettings.updateOne({ userId: botconfs.issues[args.slice(0, 1).join(' ')].authorid }, { $set: { totalPoints: userconfs.totalPoints } });

				if (!msg.guild.members.get(botconfs.issues[args.slice(0, 1).join(' ')].authorid).roles.has(msg.guild.roles.find(r => r.name.toLowerCase() === 'issue judger').id) && ((userconfs.totalPoints.suggestions + userconfs.totalPoints.bugreports) >= 50)) {
					await msg.guild.members.get(botconfs.issues[args.slice(0, 1).join(' ')].authorid).addRole(msg.guild.roles.find(r => r.name.toLowerCase() === 'issue judger'));
					msg.guild.channels.get(settings.issueJudgersChannel).send(`${msg.guild.members.get(botconfs.issues[args.slice(0, 1).join(' ')].authorid)}, Welcome to the Issue Judgers! Please read the messages pinned in the channel here for an introduction!`);
				}
			}
			msg.delete();
		});
	}
};

exports.conf = {
	enabled: true,
	guildOnly: true,
	aliases: [],
	userpermissions: [],
	issuejudger: true
};

exports.help = {
	name: 'approve',
	description: 'Approves an issue',
	usage: 'bugreport {title of the bugreport} | {description}',
	example: ['bugreport ping command bug | There is just written ping but not how many ms this message needed to send'],
	category: 'trello',
	botpermissions: ['SEND_MESSAGES']
};
