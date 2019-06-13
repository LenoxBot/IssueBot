const Discord = require('discord.js');
const settings = require('./../settings.json');

exports.run = async (client, msg, args) => {
	if (!settings.moderators.includes(msg.author.id) && !settings.owners.includes(msg.author.id)) return;
	if (msg.channel.id !== settings.processingBugreportsChannel && msg.channel.id !== settings.processingSuggestionsChannel) return;

	const input = args.slice(0, 1);
	let botconfs;
	let userconfs;

	if (!input || input.length === 0) return msg.delete() && msg.reply('You forgot to specify the Report ID!').then(m => m.delete(10000));
	if (isNaN(input)) return msg.delete() && msg.reply('You have to enter a Report ID!').then(m => m.delete(10000));
	if (args.slice(1).length === 0) return msg.delete() && msg.reply('You forgot to add information to your decline!').then(m => m.delete(10000));
	if (msg.attachments.size !== 0) return msg.delete() && msg.reply('You are not allowed to add screenshots to an decline!').then(m => m.delete(10000));

	botconfs = await client.botSettings.findOne({ botconfs: 'botconfs' });
	if (!botconfs.issues.hasOwnProperty(input.join(' '))) return msg.delete() && msg.reply('This issue does not exist!').then(m => m.delete(10000));

	// Bugreports channel:
	if (msg.channel.id === settings.processingBugreportsChannel) {
		let fetchedmessage;
		try {
			fetchedmessage = await client.channels.get(settings.processingBugreportsChannel).fetchMessage(botconfs.issues[args.slice(0, 1).join(' ')].messageid);
		} catch (error) {
			return msg.delete() && msg.reply('This bugreport doesn\'t exist anymore!').then(m => m.delete(10000));
		}

		if (args.slice(1).join(' ').length > 100) return msg.delete() && msg.reply('Your decline text has to have a maximum of 100 characters!').then(m => m.delete(10000));

		botconfs = await client.botSettings.findOne({ botconfs: 'botconfs' });
		botconfs.issues[args.slice(0, 1).join(' ')].deny[msg.author.id] = args.slice(1).join(' ');
		await client.botSettings.updateOne({ botconfs: 'botconfs' }, { $set: { issues: botconfs.issues } });

		if ((Object.keys(botconfs.issues[args.slice(0, 1).join(' ')].deny).length + Object.keys(botconfs.issues[args.slice(0, 1).join(' ')].approve).length + Object.keys(botconfs.issues[args.slice(0, 1).join(' ')].attachments).length + Object.keys(botconfs.issues[args.slice(0, 1).join(' ')].notes).length - 1) === 0) {
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

		msg.guild.members.get(botconfs.issues[args.slice(0, 1).join(' ')].authorid).send(`Thank you for your **bugreport**! Your bugreport **"${fetchedmessage.embeds[0].fields[0].value}"** was unfortunately rejected. The reason is usually in the comments of the Issue Judgers. (🆔: ${botconfs.issues[args.slice(0, 1).join(' ')].reportid})`);

		const newContent = fetchedmessage.embeds[0].description.replace('This bugreport needs to be approved/declined.', '');

		const newTitle = fetchedmessage.embeds[0].title.replace('📢', '❗❌');
		const newEmbed = new Discord.RichEmbed()
			.setTitle(newTitle)
			.setColor('RED')
			.setDescription(newContent);

		for (let i = 0; i < fetchedmessage.embeds[0].fields.length; i++) {
			newEmbed.addField(fetchedmessage.embeds[0].fields[i].name, fetchedmessage.embeds[0].fields[i].value);
		}

		msg.guild.channels.get(settings.deniedBugreportsChannel).send({
			embed: newEmbed
		});
		fetchedmessage.delete();


		botconfs = await client.botSettings.findOne({ botconfs: 'botconfs' });
		botconfs.totalIssues.bugreports.declined += 1;
		await client.botSettings.updateOne({ botconfs: 'botconfs' }, { $set: { totalIssues: botconfs.totalIssues } });

		userconfs = await client.userSettings.findOne({ userId: botconfs.issues[args.slice(0, 1).join(' ')].authorid });
		userconfs.totalIssues.bugreports.declined += 1;
		await client.userSettings.updateOne({ userId: botconfs.issues[args.slice(0, 1).join(' ')].authorid }, { $set: { totalIssues: userconfs.totalIssues } });

		userconfs = await client.userSettings.findOne({ userId: botconfs.issues[args.slice(0, 1).join(' ')].authorid });
		userconfs.totalPoints.bugreports -= 1;
		await client.userSettings.updateOne({ userId: botconfs.issues[args.slice(0, 1).join(' ')].authorid }, { $set: { totalPoints: userconfs.totalPoints } });

		msg.delete();
	} else {
		let fetchedmessage;
		try {
			fetchedmessage = await client.channels.get(settings.processingSuggestionsChannel).fetchMessage(botconfs.issues[args.slice(0, 1).join(' ')].messageid);
		} catch (error) {
			return msg.delete() && msg.reply('This suggestion doesn\'t exist anymore!').then(m => m.delete(10000));
		}

		if (args.slice(1).join(' ').length > 100) return msg.delete() && msg.reply('Your decline text has to have a maxium of 100 characters!').then(m => m.delete(10000));

		botconfs = await client.botSettings.findOne({ botconfs: 'botconfs' });
		botconfs.issues[args.slice(0, 1).join(' ')].deny[msg.author.id] = args.slice(1).join(' ');
		await client.botSettings.updateOne({ botconfs: 'botconfs' }, { $set: { issues: botconfs.issues } });

		if ((Object.keys(botconfs.issues[args.slice(0, 1).join(' ')].deny).length + Object.keys(botconfs.issues[args.slice(0, 1).join(' ')].approve).length + Object.keys(botconfs.issues[args.slice(0, 1).join(' ')].attachments).length + Object.keys(botconfs.issues[args.slice(0, 1).join(' ')].notes).length - 1) === 0) {
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

		msg.guild.members.get(botconfs.issues[args.slice(0, 1).join(' ')].authorid).send(`Thank you for your **suggestion**! Your suggestion **"${fetchedmessage.embeds[0].fields[0].value}"** was unfortunately rejected. The reason is usually in the comments of the Issue Judgers. (🆔: ${botconfs.issues[args.slice(0, 1).join(' ')].reportid})`);

		const newContent = fetchedmessage.embeds[0].description.replace('This suggestion needs to be approved/declined.', '');

		const newTitle = fetchedmessage.embeds[0].title.replace('📢', '❗❌');
		const newEmbed = new Discord.RichEmbed()
			.setTitle(newTitle)
			.setColor('RED')
			.setDescription(newContent);

		for (let i = 0; i < fetchedmessage.embeds[0].fields.length; i++) {
			newEmbed.addField(fetchedmessage.embeds[0].fields[i].name, fetchedmessage.embeds[0].fields[i].value);
		}

		msg.guild.channels.get(settings.deniedSuggestionsChannel).send({
			embed: newEmbed
		});
		fetchedmessage.delete();

		botconfs = await client.botSettings.findOne({ botconfs: 'botconfs' });
		botconfs.totalIssues.suggestions.declined += 1;
		await client.botSettings.updateOne({ botconfs: 'botconfs' }, { $set: { totalIssues: botconfs.totalIssues } });

		userconfs = await client.userSettings.findOne({ userId: botconfs.issues[args.slice(0, 1).join(' ')].authorid });
		userconfs.totalIssues.suggestions.declined += 1;
		await client.userSettings.updateOne({ userId: botconfs.issues[args.slice(0, 1).join(' ')].authorid }, { $set: { totalIssues: userconfs.totalIssues } });

		userconfs = await client.userSettings.findOne({ userId: botconfs.issues[args.slice(0, 1).join(' ')].authorid });
		userconfs.totalPoints.suggestions -= 1;
		await client.userSettings.updateOne({ userId: botconfs.issues[args.slice(0, 1).join(' ')].authorid }, { $set: { totalPoints: userconfs.totalPoints } });

		msg.delete();
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
