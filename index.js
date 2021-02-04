const Discord = require("discord.js");
const { prefix, token, masters} = require("./config.json");
const ytdl = require("ytdl-core");
const fetch = require('node-fetch');
const querystring = require('querystring');
const https = require("https");
const fs = require('fs');


const client = new Discord.Client();

const queue = new Map(); // Music queue

const jokeBaseURL = "https://sv443.net/jokeapi/v2";
const jokeCategories = ["Programming", "Miscellaneous"];
const jokeParams = [
    "blacklistFlags=nsfw,religious,racist",
    "idRange=0-100"
];


const answers = [
  ["dit slt", "slt"],
  ["test" , "tout est ok"],
  ["nice", "well done"],
  ["tg", "ok maître je me tais"],
  ["my bad", "tkt ;)"],
  ["je t'aime", "moi aussi je t'aime"],
  ["qui es-tu?", "Je suis le servant de Marc conçu pour servir et obéir à mon maître et créateur Marc Partensky."],
  // ["t'es vilain", ""],
  ["gg", "i am the best"],
  ["ça va?", "Nickel prêt à vous servir!"],
  ["comment ça va?", "tout va bien"],
  ["are you the one?" ,"https://youtu.be/dT8dmvAzIqA?t=14"],
  // ["merci", `de rien ${message.author}`]
];

const playlists = [];

client.once("ready", () => {
  console.log("Ready!");
});

client.once("reconnecting", () => {
  console.log("Reconnecting!");
});

client.once("disconnect", () => {
  console.log("Disconnect!");
});

client.on("message", async message => {
  try {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

    for (const answer of answers) {
      if (message.content.toLowerCase().startsWith(`${prefix}${answer[0]}`)) {
        message.channel.send(`${answer[1]}`);
        return;
      }
    }
    if (message.content.toLowerCase().startsWith(`${prefix}montre un chat`)) {
    	const { file } = await fetch('https://aws.random.cat/meow').then(response => response.json());
    	message.channel.send(file);
      return ;
    } else if (message.content.toLowerCase().startsWith(`${prefix}tell me a joke`)) {
      try {
        https.get(`${jokeBaseURL}/joke/${jokeCategories.join(",")}?${jokeParams.join("&")}`, res => {
            res.on("data", chunk => {
                // console.log(String.raw({raw:chunk.toString()}));
                // console.log(chunk.toString());
                let randomJoke = JSON.parse(chunk.toString());
                if(randomJoke.type == "single") {
                  message.channel.send(randomJoke.joke);
                } else {
                  message.channel.send(randomJoke.setup);
                  setTimeout(() => {
                    message.channel.send(randomJoke.delivery);
                  }, 3000);
              }
            });
            res.on("error", err => {
                console.error(`Error: ${err}`);
            });
        });
      } catch(e) {
        message.channel.send(e.message);
      }
    	// const { file } = await fetch('https://sv443.net/jokeapi/v2/joke/Any').then(response => response.json());
      // console.log(file.joke);
    	// message.channel.send(file || "no joke here");
      return ;
    } else if (message.content.toLowerCase().startsWith(`${prefix}define in urban`)) {
      const args = message.content.split(' ').slice(4);
      if (!args.length) {
        return message.channel.send('You need to supply a search term!');
      }
      const query = querystring.stringify({ term: args.join(' ') });
      const { list } = await fetch(`https://api.urbandictionary.com/v0/define?${query}`).then(response => response.json());
      if (!list.length) {
        message.channel.send(`No results found for **${args.join(' ')}**.`);
        return;
      } else {
        message.channel.send(list[0].definition);
      }
    } else if (message.content.startsWith(`${prefix}merci`)) {
      message.channel.send(`de rien ${message.author}`);
      return;
    } else if (message.content.startsWith(`${prefix}code`)) {
      if (message.content.includes('(') || message.content.includes(')')) {
        message.channel.send(`Les fonctions ne sont pas autorisées.`);
      } else {
        message.channel.send(`${eval(message.content.split(' ')[2])}`);
      }
      return;
    } else if (message.content.startsWith(`${prefix}fais moi de la pub`)) {
        message.channel.send(`${message.author} c'est le boss! Abonnez-vous!`);
        return;
    } else if (message.content.startsWith(`${prefix}t'es vilain`)) {
      message.channel.send("snif", {files: ["./imgs/servant t'es vilain.jpg"]});
      return;
    } else if (message.content.startsWith(`${prefix}assis`)) {
      message.channel.send("ok", {files: ["./imgs/servant assis.jpg"]});
      return;
    } else if (message.content.startsWith(`${prefix}couché`)) {
      message.channel.send("ok", {files: ["./imgs/servant couché.jpg"]});
      return;
    } else if (message.content.startsWith(`${prefix}la fessée`)) {
      message.channel.send("naannnn", {files: ["./imgs/servant la fessée.jpg"]});
      return;
    } else if (message.content.startsWith(`${prefix}qui suis-je?`)) {
      if (masters.includes(String(message.author))) {
        message.channel.send("Vous êtes mon maître.");
      } else {
        message.channel.send("Vous êtes:" + String(message.author));
      }
      return;
    }

    const serverQueue = queue.get(message.guild.id);

    if (message.content.startsWith(`${prefix}play`) ||
              message.content.startsWith(`${prefix}music`)) {
      execute(message, serverQueue);
      return;
    } else if (message.content.startsWith(`${prefix}skip`)) {
      skip(message, serverQueue);
      return;
    } else if (message.content.startsWith(`${prefix}stop`)) {
      stop(message, serverQueue);
      return;
    } else {
      message.channel.send(`Mais wesh je connais pas "${message.content}" tu m'as pris pour qui?`);
    }
  } catch(e) {
    console.log("made it there")
    message.channel.send(`Console Error "${e.message}"`);
  }
});

async function execute(message, serverQueue) {
  const args = message.content.split(" ");

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel)
    return message.channel.send(
      "Faut être dans une channel pour lancer une musique! -_-"
    );
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send(
      "Donne moi le droit de venir et de parler puis on en reparle!"
    );
  }

  const songInfo = await ytdl.getInfo(args[2]);
  const song = {
    title: songInfo.title,
    url: songInfo.video_url
  };

  if (!serverQueue) {
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true
    };

    queue.set(message.guild.id, queueContruct);

    if (args.length==5) {
      if (args[4]=="fois") {
        for (let i=0; i<parseInt(args[3]); i++) {
          queueContruct.songs.push(song);
        }
      } else {
        return message.channel.send(`Ça veut dire quoi ${args[3]} ${args[4]}?`);
      }
    } else {
      queueContruct.songs.push(song);
    }


    try {
      var connection = await voiceChannel.join();
      queueContruct.connection = connection;
      play(message.guild, queueContruct.songs[0]);
    } catch (err) {
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    serverQueue.songs.push(song);
    return message.channel.send(`${song.title} a été ajouté à la playlist!`);
  }
}

function skip(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "Faut être dans une channel sinon flemme de venir."
    );
  if (!serverQueue)
    return message.channel.send("Y'a rien a skip!");
  serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "Faut être dans une channel pour stop une musique! -_-"
    );
  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}

function play(guild, song) {
  const serverQueue = queue.get(guild.id);
  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }

  const dispatcher = serverQueue.connection
    .play(ytdl(song.url))
    .on("finish", () => {
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on("error", error => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  serverQueue.textChannel.send(`C'est parti pour un peu de: **${song.title}**`);
}

function recordAudio() {
	// Create a ReadableStream of s16le PCM audio
	const audio = connection.receiver.createStream(user, { mode: 'pcm' });
	audio.pipe(fs.createWriteStream('user_audio'));
	connectionB.play(audio, { type: 'opus' });
}

async function play(voiceChannel) {
	const connection = await voiceChannel.join();
	connection.play('audio.mp3');
}


client.login(token);
