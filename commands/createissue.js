const Discord = require('discord.js');
exports.run = async (client, msg) => {
	const trello = client.trello;
	if (msg.guild.id !== '352896116812939264') return msg.channel.send('The bugreport must be written to the LenoxBot Discord server!');

	const array = [];
	const questions = [
		'What is the title of your bugreport?',
		'How can you reproduce the bug? (Explain in steps)',
		'Which result would normally have to be?',
		'What happens if you do the action now?'
	];
	let typeBugreport;

	await msg.channel.send('A new bugreport form has been created! Each answer can only contain a maximum of 300 characters');

	const typeMessage = await msg.reply('What is this bugreport about? \n🔴 = BOT(S) \n🔵 = WEBSITE/DASHBOARD \n\nPlease react to the reaction that best suits this bugreport!');
	await typeMessage.react('🔴');
	await typeMessage.react('🔵');

	const collector = typeMessage.createReactionCollector((reaction, user) => user.id === msg.author.id, {
		time: 30000
	});
	collector.on('collect', r => {
		if (r.emoji.name === '🔴') {
			typeBugreport = 'bot';
			collector.stop();
		} else {
			typeBugreport = 'website';
			collector.stop();
		}
	});

	collector.on('end', async (collected, reason) => {
		typeMessage.delete();
		if (reason === 'time') return msg.reply('You didn\'t react to the message').then(m => m.delete(10000));

		for (let i = 0; i < questions.length; i++) {
			try {
				await msg.channel.send(`${msg.author}, ${questions[i]}`);
				const response = await msg.channel.awaitMessages(msg2 => msg2.attachments.size === 0 && msg.author.id === msg2.author.id && !msg2.author.bot && msg2.content.length <= 300, {
					maxMatches: 1,
					time: 600000,
					errors: ['time']
				});
				array.push(response.first().content);
				await response.first().delete();
			} catch (error) {
				return msg.channel.send('Bugreport was canceled because you did not answer after 10 minutes');
			}
		}

		msg.channel.send('Bugreport successfully sent! It will now be checked by the Bugreporters');

		const channel = client.channels.get('497392386847014934');
		const tableload = client.bugreports.get('bugreports');
		const bugreportembed = new Discord.RichEmbed()
			.setColor('#ff9900')
			.setDescription(`Bug reported by ${msg.author.username} \n\n**Is it a bugreport for the website or for the bot?**: ${typeBugreport}\n**${questions[0]}:** ${array[0]} \n**${questions[1]}:** ${array[1]} \n**${questions[2]}:** ${array[2]} \n**${questions[3]}:** ${array[3]} \n\nThe bugreport above needs to be approved.\n\n**ReportID: ${tableload.reportid + 1}** \n`);
		const message = await channel.send({
			embed: bugreportembed
		});

		const bugreport = {
			reportid: tableload.reportid + 1,
			messageid: message.id,
			authorid: msg.author.id,
			attachments: {},
			notes: {},
			approve: {},
			deny: {},
			important: 0,
			mediumimportant: 0,
			unimportant: 0,
			type: typeBugreport
		};

		const content = message.embeds[0].description.split().slice().join(' ');
		const newcontent = content.replace('The bugreport above needs to be approved.', '');

		tableload.reportid += 1;

		await trello.addCard(array[0], `**Bugreport:** \n${newcontent}`, '59ef6ee0f7e744cff0058d8f',
			async (error, trelloCard) => {
				bugreport.trelloid = trelloCard.id;
				bugreport.url = trelloCard.shortUrl;
				await client.bugreports.set(`${tableload.reportid}`, bugreport);

				if (typeBugreport === 'bot') {
					trello.addLabelToCard(trelloCard.id, '5baf58f7d96d4d3a9eab4e27');
				} else {
					trello.addLabelToCard(trelloCard.id, '5baf58eb0d25347fcfb34534');
				}

				if (error) {
					console.log(error);
					return msg.channel.send('Error');
				}
			});
		await client.bugreports.set('bugreports', tableload);
	});
};

exports.conf = {
	enabled: true,
	guildOnly: true,
	aliases: [],
	userpermissions: []
};

exports.help = {
	name: 'bugreport',
	description: 'You can submit a new bugreport by using this command',
	usage: 'bugreport {title of the bugreport} | {description}',
	example: ['bugreport ping command bug | There is just written ping but not how many ms this message needed to send'],
	category: 'trello',
	botpermissions: ['SEND_MESSAGES']
};
