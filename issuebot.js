const Discord = require('discord.js');
const client = new Discord.Client();
const settings = require('./settings.json');
const mongodb = require('mongodb');
const fs = require('fs');

let mongoUrl;
let dbClient;
let db;
async function connectMongoDB() {
	mongoUrl = `mongodb://${encodeURIComponent(settings.db.user)}:${encodeURIComponent(settings.db.password)}@${encodeURIComponent(settings.db.host)}:${encodeURIComponent(settings.db.port)}/?authMechanism=DEFAULT&authSource=admin`;
	dbClient = await mongodb.MongoClient.connect(mongoUrl, { useNewUrlParser: true });
	db = dbClient.db('issuebot');
}

connectMongoDB().catch(error => {
	console.log(error);
});

client.botSettingsCollection = db.collection('botSettings');
client.userSettingsCollection = db.collection('userSettings');
client.issuesSettingsCollection = db.collection('issuesSettings');


process.on('unhandledRejection', reason => {
	if (reason.name === 'DiscordAPIError') return;
	console.error(reason);
});

fs.readdir('./events/', (err, files) => {
	if (err) return console.error(err);
	files.forEach(file => {
		const eventFunction = require(`./events/${file}`);
		const eventName = file.split('.')[0];
		client.on(eventName, (...args) => eventFunction.run(client, ...args));
	});
});

client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();
fs.readdir(`./commands/`, (err, files) => {
	if (err) console.error(err);
	files.forEach(f => {
		const props = require(`./commands/${f}`);
		client.commands.set(props.help.name, props);
		props.conf.aliases.forEach(alias => {
			client.aliases.set(alias, props.help.name);
		});
	});
});

client.login(settings.token);
