exports.run = async (client, msg) => {
	if (msg.author.bot) return;
	if (!client.isMongodbReady) return;

	if (!client) {
		userdb = {};
		userdb.points = 0;
		await client.userdb.set(msg.author.id, userdb);
	}

	if (!tableload.reportid) {
		tableload.reportid = 0;
		await client.bugreports.set('bugreports', tableload);
	}

	const prefix = '?';
	if (msg.content.startsWith(prefix)) {
		const args = msg.content.split(' ').slice(1);
		const command = msg.content.split(' ')[0].slice(prefix.length).toLowerCase();
		let cmd;

		if (client.commands.has(command)) {
			cmd = client.commands.get(command);
		} else if (client.aliases.has(command)) {
			cmd = client.commands.get(client.aliases.get(command));
		}

		if (cmd) {
			cmd.run(client, msg, args);
		}
	}
	if (msg.channel.id === '497392386847014934') {
		if (!msg.content.startsWith(`${prefix}approve`) && !msg.content.startsWith(`${prefix}deny`) && !msg.content.startsWith(`${prefix}addattachment`) && !msg.content.startsWith(`${prefix}addnote`)) {
			msg.delete();
		}
	}
};
