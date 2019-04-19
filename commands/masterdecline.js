const Discord = require('discord.js');
const settings = require('./../settings.json');

exports.run = async (client, msg, args) => {
	if (!settings.administrators.includes(msg.author.id) && !settings.owners.includes(msg.author.id)) return;
	if (msg.channel.id !== settings.processingBugreportsChannel && msg.channel.id !== settings.processingSuggestionsChannel) return;

	const input = args.slice(0, 1);
	const botconfs = await client.botSettings.findOne({ botconfs: 'botconfs' });

	if (!input || input.length === 0) return msg.delete() && msg.reply('You forgot to specify the Report ID!').then(m => m.delete(10000));
	if (isNaN(input)) return msg.delete() && msg.reply('You have to enter a Report ID!').then(m => m.delete(10000));
	if (args.slice(1).length === 0) return msg.delete() && msg.reply('You forgot to add information to your decline!').then(m => m.delete(10000));
	if (msg.attachments.size !== 0) return msg.delete() && msg.reply('You are not allowed to add screenshots to an decline!').then(m => m.delete(10000));
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

		if (args.slice(1).join(' ').length > 100) return msg.delete() && msg.reply('Your decline text has to have a maximum of 100 characters!').then(m => m.delete(10000));

		issueconfs.approve[msg.author.id] = args.slice(1).join(' ');

		if ((Object.keys(issueconfs.deny).length + Object.keys(issueconfs.approve).length + Object.keys(issueconfs.attachments).length + Object.keys(issueconfs.notes).length - 1) === 0) {
			const newField = `❗❌ **${msg.author.username}:** ${args.slice(1).join(' ')}`;
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
			const newField = `❗❌ **${msg.author.username}:** ${args.slice(1).join(' ')}`;
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

		await msg.reply('The report was masterdeclined successfully!').then(m => m.delete(10000));

		msg.guild.members.get(issueconfs.authorid).send(`Thank you for your bugreport! Your bugreport was unfortunately rejected. The reason is usually in the comments of the Issue Judgers. (🆔: ${issueconfs.reportid})`);

		const newContent = fetchedmessage.embeds[0].description.replace('This bugreport needs to be approved/declined.', '');

		const newEmbed = new Discord.RichEmbed()
			.setTitle(`❗❌ Bug reported by ${msg.author.username} (${msg.author.id})`)
			.setColor('RED')
			.setDescription(newContent);

		for (let i = 0; i < fetchedmessage.embeds[0].fields.length; i++) {
			newEmbed.addField(fetchedmessage.embeds[0].fields[i].name, fetchedmessage.embeds[0].fields[i].value);
		}

		msg.guild.channels.get(settings.deniedBugreportsChannel).send({
			embed: newEmbed
		});
		fetchedmessage.delete();


		botconfs.settings.totalIssues.bugreports.declined += 1;
		userconfs.settings.totalIssues.bugreports.declined += 1;

		userconfs.settings.totalPoints.bugreports -= 1;

		msg.delete();

		await client.botSettings.updateOne({ botconfs: 'botconfs' }, { $set: { settings: botconfs.settings } });
		await client.userSettings.updateOne({ userId: issueconfs.authorid }, { $set: { settings: userconfs.settings } });
	} else {
		let fetchedmessage;
		try {
			fetchedmessage = await client.channels.get(settings.processingSuggestionsChannel).fetchMessage(issueconfs.messageid);
		} catch (error) {
			return msg.delete() && msg.reply('This suggestion doesn\'t exist anymore!').then(m => m.delete(10000));
		}

		if (args.slice(1).join(' ').length > 100) return msg.delete() && msg.reply('Your decline text has to have a maxium of 100 characters!').then(m => m.delete(10000));

		issueconfs.approve[msg.author.id] = args.slice(1).join(' ');

		if ((Object.keys(issueconfs.deny).length + Object.keys(issueconfs.approve).length + Object.keys(issueconfs.attachments).length + Object.keys(issueconfs.notes).length - 1) === 0) {
			const newField = `❗❌ **${msg.author.username}:** ${args.slice(1).join(' ')}`;
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
			const newField = `❗❌ **${msg.author.username}:** ${args.slice(1).join(' ')}`;
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

		await msg.reply('The report was masterdeclined successfully!').then(m => m.delete(10000));

		msg.guild.members.get(issueconfs.authorid).send(`Thank you for your suggestion! Your suggestion was unfortunately rejected. The reason is usually in the comments of the Issue Judgers. (🆔: ${issueconfs.reportid})`);

		const newContent = fetchedmessage.embeds[0].description.replace('This suggestion needs to be approved/declined.', '');

		const newEmbed = new Discord.RichEmbed()
			.setTitle(`❗❌ Suggestion reported by ${msg.author.username} (${msg.author.id})`)
			.setColor('RED')
			.setDescription(newContent);

		for (let i = 0; i < fetchedmessage.embeds[0].fields.length; i++) {
			newEmbed.addField(fetchedmessage.embeds[0].fields[i].name, fetchedmessage.embeds[0].fields[i].value);
		}

		msg.guild.channels.get(settings.deniedSuggestionsChannel).send({
			embed: newEmbed
		});
		fetchedmessage.delete();

		botconfs.settings.totalIssues.suggestions.declined += 1;
		userconfs.settings.totalIssues.suggestions.declined += 1;

		userconfs.settings.totalPoints.suggestions -= 1;

		msg.delete();

		await client.botSettings.updateOne({ botconfs: 'botconfs' }, { $set: { settings: botconfs.settings } });
		await client.userSettings.updateOne({ userId: issueconfs.authorid }, { $set: { settings: userconfs.settings } });
	}
};

exports.conf = {
	enabled: true,
	guildOnly: true,
	aliases: [],
	userpermissions: []
};

exports.help = {
	name: 'masterdecline',
	description: 'You can submit a new bugreport by using this command',
	usage: 'bugreport {title of the bugreport} | {description}',
	example: ['bugreport ping command bug | There is just written ping but not how many ms this message needed to send'],
	category: 'trello',
	botpermissions: ['SEND_MESSAGES']
};
