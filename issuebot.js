const Discord = require('discord.js');
const client = new Discord.Client();
const settings = require('./settings.json');
const mongodb = require('mongodb');
const fs = require('fs');
const GitHub = require('github-api');

client.isMongodbReady = false;

let mongoUrl;
let dbClient;
let db;
async function connectMongoDB() {
	mongoUrl = `mongodb://${encodeURIComponent(settings.db.user)}:${encodeURIComponent(settings.db.password)}@${encodeURIComponent(settings.db.host)}:${encodeURIComponent(settings.db.port)}/?authMechanism=DEFAULT&authSource=admin`;
	dbClient = await mongodb.MongoClient.connect(mongoUrl, { useNewUrlParser: true });
	db = dbClient.db('issuebot');

	client.botSettings = db.collection('botSettings');
	client.userSettings = db.collection('userSettings');

	client.isMongodbReady = true;
}

connectMongoDB().catch(error => {
	console.log(error);
});


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

client.GitHub = new GitHub({
	username: settings.github.username,
	password: settings.github.password
});

client.bugreportQuestions = {
	questions: [{
		question: 'What is the title of your bugreport?',
		minChars: 15,
		maxChars: 100
	},
	{
		question: 'How can you reproduce the bug?',
		minChars: 30,
		maxChars: 600
	},
	{
		question: 'Which result would normally have to be?',
		minChars: 30,
		maxChars: 600
	}]
};

client.suggestionQuestions = {
	questions: [{
		question: 'What is the title of your suggestion?',
		minChars: 15,
		maxChars: 100
	},
	{
		question: 'Explain your suggestion more accurately (It\'s best to give as much information as possible, so that we can implement the suggestion better)',
		minChars: 30,
		maxChars: 600
	},
	{
		question: 'Why should we add this feature?',
		minChars: 30,
		maxChars: 600
	}]
};

client.login(settings.token);
