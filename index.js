const Discord = require("discord.js");
const { prefix, token, masters} = require("./config.json");
const ytdl = require("ytdl-core");

const client = new Discord.Client();

const queue = new Map();

const reponses = [
  ["tg", "ok maître je me tais"],
  ["my bad", "tkt ;)"],
  // ["merci", `de rien ${message.author}`]
]

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
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const serverQueue = queue.get(message.guild.id);
  if (message.content.startsWith(`${prefix}tg`)) {
    message.channel.send("Ok maître je me tais.");
    return;
  } else if (message.content.startsWith(`${prefix}my bad`)) {
      message.channel.send("tkt ;)");
      return;
  } else if (message.content.startsWith(`${prefix}merci`)) {
      message.channel.send(`de rien ${message.author}`);
      return;
  } else if (message.content.startsWith(`${prefix}fais moi de la pub`)) {
      message.channel.send(`${message.author} c'est le boss! Abonner vous!`);
      return;
  } else if (message.content.startsWith(`${prefix}qui suis-je?`)) {
    if (masters.includes(String(message.author))) {
      message.channel.send("Vous êtes mon maître.");
    } else {
      message.channel.send("Vous êtes:" + String(message.author));
    }
    return;
  } else if (message.content.startsWith(`${prefix}play`) ||
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

client.login(token);
