const Discord = require('discord.js');
const settings = require('./../settings.json');

exports.run = async (client, msg, args) => {
	if (msg.channel.id !== settings.processingBugreportsChannel && msg.channel.id !== settings.processingSuggestionsChannel) return;
	const input = args.slice(0, 1);
	let botconfs;

	if (!input || input.length === 0) return msg.delete() && msg.reply('You forgot to specify the report ID!').then(m => m.delete(10000));
	if (isNaN(input)) return msg.delete() && msg.reply('You have to enter a Report ID').then(m => m.delete(10000));
	if (args.slice(1).length === 0) return msg.delete() && msg.reply('You forgot to provide a screenshot link!').then(m => m.delete(10000));
	if (msg.attachments.size !== 0) return msg.delete() && msg.reply('You have to upload the screenshot on a website!').then(m => m.delete(10000));

	const regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
	if (regexp.test(args.slice(1).join(' ')) === false) return msg.delete() && msg.reply('This isn`t a valid link with a screenshot!').then(m => m.delete(10000));

	if (args.slice(1).join(' ').match(/\.(jpeg|jpg|gif|png)$/) === null) return msg.delete() && msg.reply('Your image link has to end with .JPEG, .JPG, .PNG or .GIF!').then(m => m.delete(10000));

	botconfs = await client.botSettings.findOne({ botconfs: 'botconfs' });
	if (!botconfs.issues.hasOwnProperty(input.join(' '))) return msg.delete() && msg.reply('This issue does not exist!').then(m => m.delete(10000));

	if (botconfs.issues[args.slice(0, 1).join(' ')].attachments.hasOwnProperty(msg.author.id)) return msg.delete() && msg.reply('You have already added an attachment this report').then(m => m.delete(10000));

	botconfs = await client.botSettings.findOne({ botconfs: 'botconfs' });
	botconfs.issues[args.slice(0, 1).join(' ')].attachments[msg.author.id] = args.slice(1).join(' ');
	await client.botSettings.updateOne({ botconfs: 'botconfs' }, { $set: { issues: botconfs.issues } });

	// Bugreports channel:
	if (msg.channel.id === settings.processingBugreportsChannel) {
		let fetchedmessage;
		try {
			fetchedmessage = await client.channels.get(settings.processingBugreportsChannel).fetchMessage(botconfs.issues[args.slice(0, 1).join(' ')].messageid);
		} catch (error) {
			return msg.delete() && msg.reply('This bugreport doesn\'t exist anymore').then(m => m.delete(10000));
		}

		if ((Object.keys(botconfs.issues[args.slice(0, 1).join(' ')].deny).length + Object.keys(botconfs.issues[args.slice(0, 1).join(' ')].approve).length + Object.keys(botconfs.issues[args.slice(0, 1).join(' ')].attachments).length + Object.keys(botconfs.issues[args.slice(0, 1).join(' ')].notes).length - 1) === 0) {
			const newField = `📸 **${msg.author.username}:** ${args.slice(1).join(' ')}`;
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
			const newField = `📸 **${msg.author.username}:** ${args.slice(1).join(' ')}`;
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

		msg.delete();
		msg.reply('The attachment was added successfully to the issue!').then(m => m.delete(10000));
	} else {
		let fetchedmessage;
		try {
			fetchedmessage = await client.channels.get(settings.processingSuggestionsChannel).fetchMessage(botconfs.issues[args.slice(0, 1).join(' ')].messageid);
		} catch (error) {
			return msg.delete() && msg.reply('This suggestion doesn\'t exist anymore').then(m => m.delete(10000));
		}

		if ((Object.keys(botconfs.issues[args.slice(0, 1).join(' ')].deny).length + Object.keys(botconfs.issues[args.slice(0, 1).join(' ')].approve).length + Object.keys(botconfs.issues[args.slice(0, 1).join(' ')].attachments).length + Object.keys(botconfs.issues[args.slice(0, 1).join(' ')].notes).length - 1) === 0) {
			const newField = `📸 **${msg.author.username}:** ${args.slice(1).join(' ')}`;
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
			const newField = `📸 **${msg.author.username}:** ${args.slice(1).join(' ')}`;
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
		msg.delete();
		msg.reply('The attachment was added successfully to the issue!').then(m => m.delete(10000));
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
	name: 'addattachment',
	description: 'Adds an attachment to an issue',
	usage: 'bugreport {title of the bugreport} | {description}',
	example: ['bugreport ping command bug | There is just written ping but not how many ms this message needed to send'],
	category: 'trello',
	botpermissions: ['SEND_MESSAGES']
};
