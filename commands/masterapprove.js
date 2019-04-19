const Discord = require('discord.js');
const settings = require('./../settings.json');

exports.run = async (client, msg, args) => {
	if (!settings.moderators.includes(msg.author.id) && !settings.owners.includes(msg.author.id)) return;
	if (msg.channel.id !== settings.processingBugreportsChannel && msg.channel.id !== settings.processingSuggestionsChannel) return;

	const input = args.slice(0, 1);
	const botconfs = await client.botSettings.findOne({ botconfs: 'botconfs' });

	if (!input || input.length === 0) return msg.delete() && msg.reply('You forgot to specify the Report ID!').then(m => m.delete(10000));
	if (isNaN(input)) return msg.delete() && msg.reply('You have to enter a Report ID!').then(m => m.delete(10000));
	if (args.slice(1).length === 0) return msg.delete() && msg.reply('You forgot to add information to your approve!').then(m => m.delete(10000));
	if (msg.attachments.size !== 0) return msg.delete() && msg.reply('You are not allowed to add screenshots to an approve!').then(m => m.delete(10000));
	if (!botconfs.settings.issues.hasOwnProperty(input.join(' '))) return msg.delete() && msg.reply('This issue does not exist!').then(m => m.delete(10000));

	const issueconfs = botconfs.settings.issues[args.slice(0, 1).join(' ')];
	const userconfs = await client.userSettings.findOne({ userId: issueconfs.authorid });

	// Bugreports channel:
	if (msg.channel.id === settings.processingBugreportsChannel) {
		let fetchedmessage;
		try {
			fetchedmessage = await client.channels.get(settings.processingBugreportsChannel).fetchMessage(issueconfs.messageid);
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
		collector.on('collect', r => {
			if (r.emoji.name === '🔴') {
				issueconfs.important += 1;
				collector.stop();
			} else if (r.emoji.name === '🔵') {
				issueconfs.mediumimportant += 1;
				collector.stop();
			} else if (r.emoji.name === '⚫') {
				issueconfs.unimportant += 1;
				collector.stop();
			}
		});

		collector.on('end', async (collected, reason) => {
			message.delete();
			if (reason === 'time') return msg.delete() && msg.reply('You didn\'t react to the message').then(m => m.delete(10000));

			issueconfs.approve[msg.author.id] = args.slice(1).join(' ');

			if ((Object.keys(issueconfs.deny).length + Object.keys(issueconfs.approve).length + Object.keys(issueconfs.attachments).length + Object.keys(issueconfs.notes).length - 1) === 0) {
				const newField = `❗✅ **${msg.author.username}:** ${args.slice(1).join(' ')}`;
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
				const newField = `❗✅ **${msg.author.username}:** ${args.slice(1).join(' ')}`;
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

			await msg.reply('The report was masterapproved successfully!').then(m => m.delete(10000));

			msg.guild.members.get(issueconfs.authorid).send(`Thank you for your bugreport! Your bugreport has been accepted and will be processed as soon as possible. As a thank, you got 200 credits! (🆔: ${issueconfs.reportid})`);

			const newContent = fetchedmessage.embeds[0].description.replace('This bugreport needs to be approved/declined.', '');

			const newTitle = fetchedmessage.embeds[0].title.replace('📢', '❗✅');
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

			if (issueconfs.important >= 1) {
				GitHubIssue.labels.push('p: high');
			} else if (issueconfs.mediumimportant >= 1) {
				GitHubIssue.labels.push('p: medium');
			} else {
				GitHubIssue.labels.push('p: low');
			}

			const LenoxBotIssues = await client.GitHub.getIssues('LenoxBot', 'LenoxBot');
			const createdIssue = await LenoxBotIssues.createIssue(GitHubIssue);

			newEmbed.setURL(createdIssue.data.html_url);

			msg.guild.channels.get(settings.approvedBugreportsChannel).send({
				embed: newEmbed
			});
			fetchedmessage.delete();

			issueconfs.github.url = createdIssue.data.html_url;
			issueconfs.github.id = createdIssue.data.id;

			botconfs.settings.totalIssues.bugreports.accepted += 1;
			userconfs.settings.totalIssues.bugreports.accepted += 1;

			userconfs.settings.totalPoints.bugreports += 5;

			if (!msg.guild.members.get(issueconfs.authorid).roles.has(msg.guild.roles.find(r => r.name.toLowerCase() === 'issue judger').id) && ((userconfs.settings.totalPoints.suggestions + userconfs.settings.totalPoints.bugreports) >= 50)) {
				await msg.guild.members.get(issueconfs.authorid).addRole(msg.guild.roles.find(r => r.name.toLowerCase() === 'issue judger'));
				msg.guild.channels.get(settings.issueJudgersChannel).send(`${msg.guild.members.get(issueconfs.authorid)}, Welcome to the Issue Judgers! Please read the messages pinned in the channel here for an introduction!`);
			}

			msg.delete();

			await client.botSettings.updateOne({ botconfs: 'botconfs' }, { $set: { settings: botconfs.settings } });
			await client.userSettings.updateOne({ userId: issueconfs.authorid }, { $set: { settings: userconfs.settings } });
		});
	} else {
		let fetchedmessage;
		try {
			fetchedmessage = await client.channels.get(settings.processingSuggestionsChannel).fetchMessage(issueconfs.messageid);
		} catch (error) {
			return msg.reply('This suggestion doesn\'t exist anymore!').then(m => m.delete(10000));
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
		collector.on('collect', r => {
			if (r.emoji.name === '🔴') {
				issueconfs.important += 1;
				collector.stop();
			} else if (r.emoji.name === '🔵') {
				issueconfs.mediumimportant += 1;
				collector.stop();
			} else if (r.emoji.name === '⚫') {
				issueconfs.unimportant += 1;
				collector.stop();
			}
		});

		collector.on('end', async (collected, reason) => {
			message.delete();
			if (reason === 'time') return msg.reply('You didn\'t react to the message').then(m => m.delete(10000));

			issueconfs.approve[msg.author.id] = args.slice(1).join(' ');

			if ((Object.keys(issueconfs.deny).length + Object.keys(issueconfs.approve).length + Object.keys(issueconfs.attachments).length + Object.keys(issueconfs.notes).length - 1) === 0) {
				const newField = `❗✅ **${msg.author.username}:** ${args.slice(1).join(' ')}`;
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
				const newField = `❗✅ **${msg.author.username}:** ${args.slice(1).join(' ')}`;
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

			await msg.reply('The report was masterapproved successfully!').then(m => m.delete(10000));

			msg.guild.members.get(issueconfs.authorid).send(`Thank you for your suggestion! Your suggestion has been accepted and will be processed as soon as possible. As a thank, you got 200 credits! (🆔: ${issueconfs.reportid})`);

			const newContent = fetchedmessage.embeds[0].description.replace('This suggestion needs to be approved/declined.', '');

			const newTitle = fetchedmessage.embeds[0].title.replace('📢', '❗✅');
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

			if (issueconfs.important >= 1) {
				GitHubIssue.labels.push('p: high');
			} else if (issueconfs.mediumimportant >= 1) {
				GitHubIssue.labels.push('p: medium');
			} else {
				GitHubIssue.labels.push('p: low');
			}

			const LenoxBotIssues = await client.GitHub.getIssues('LenoxBot', 'LenoxBot');
			const createdIssue = await LenoxBotIssues.createIssue(GitHubIssue);

			newEmbed.setURL(createdIssue.data.html_url);

			msg.guild.channels.get(settings.approvedSuggestionsChannel).send({
				embed: newEmbed
			});
			fetchedmessage.delete();

			issueconfs.github.url = createdIssue.data.html_url;
			issueconfs.github.id = createdIssue.data.id;

			botconfs.settings.totalIssues.suggestions.accepted += 1;
			userconfs.settings.totalIssues.suggestions.accepted += 1;

			userconfs.settings.totalPoints.suggestions += 5;

			if (!msg.guild.members.get(issueconfs.authorid).roles.has(msg.guild.roles.find(r => r.name.toLowerCase() === 'issue judger').id) && ((userconfs.settings.totalPoints.suggestions + userconfs.settings.totalPoints.bugreports) >= 50)) {
				await msg.guild.members.get(issueconfs.authorid).addRole(msg.guild.roles.find(r => r.name.toLowerCase() === 'issue judger'));
				msg.guild.channels.get(settings.issueJudgersChannel).send(`${msg.guild.members.get(issueconfs.authorid)}, Welcome to the Issue Judgers! Please read the messages pinned in the channel here for an introduction!`);
			}

			msg.delete();

			await client.botSettings.updateOne({ botconfs: 'botconfs' }, { $set: { settings: botconfs.settings } });
			await client.userSettings.updateOne({ userId: issueconfs.authorid }, { $set: { settings: userconfs.settings } });
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
	name: 'masterapprove',
	description: 'You can submit a new bugreport by using this command',
	usage: 'bugreport {title of the bugreport} | {description}',
	example: ['bugreport ping command bug | There is just written ping but not how many ms this message needed to send'],
	category: 'trello',
	botpermissions: ['SEND_MESSAGES']
};
