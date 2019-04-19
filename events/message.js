const settings = require('./../settings.json');

exports.run = async (client, msg) => {
	if (msg.author.bot) return;
	if (!client.isMongodbReady) return;

	const findUser = await client.userSettings.findOne({ userId: msg.author.id });
	if (!findUser) {
		await client.userSettings.insertOne({
			userId: msg.author.id, settings: {
				totalIssues: {
					bugreports: {
						total: 0,
						accepted: 0,
						declined: 0
					},
					suggestions: {
						total: 0,
						accepted: 0,
						declined: 0
					}
				},
				totalPoints: {
					bugreports: 0,
					suggestions: 0
				},
				acceptedRules: false,
				noIssueJudger: false
			}
		});
	}

	const findBotconfs = await client.botSettings.findOne({ botconfs: 'botconfs' });
	if (!findBotconfs) {
		await client.botSettings.insertOne({
			botconfs: 'botconfs', settings: {
				ignoredUsers: {},
				totalIssues: {
					bugreports: {
						total: 0,
						accepted: 0,
						declined: 0
					},
					suggestions: {
						total: 0,
						accepted: 0,
						declined: 0
					}
				},
				issues: {},
				issuescount: 0
			}
		});
	}

	const prefix = '?';

	if (msg.channel.id === settings.processingBugreportsChannel && !msg.content.startsWith(`${prefix}approve`) && !msg.content.startsWith(`${prefix}decline`) && !msg.content.startsWith(`${prefix}addattachment`) && !msg.content.startsWith(`${prefix}addnote`) && !msg.content.startsWith(`${prefix}masterapprove`) && !msg.content.startsWith(`${prefix}masterdecline`)) {
		msg.delete();
	}
	if (msg.channel.id === settings.processingSuggestionsChannel && !msg.content.startsWith(`${prefix}approve`) && !msg.content.startsWith(`${prefix}decline`) && !msg.content.startsWith(`${prefix}addattachment`) && !msg.content.startsWith(`${prefix}addnote`) && !msg.content.startsWith(`${prefix}masterapprove`) && !msg.content.startsWith(`${prefix}masterdecline`)) {
		msg.delete();
	}

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
};
