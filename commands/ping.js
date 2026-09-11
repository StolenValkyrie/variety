const { SlashCommandBuilder } = require("discord.js");

const data = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Check the bot's latency.");

async function execute(message) {
  const sent = await message.reply("Pinging...");
  const latency = sent.createdTimestamp - message.createdTimestamp;
  await sent.edit(`Pong! Latency: ${latency}ms | API: ${message.client.ws.ping}ms`);
}

async function executeSlash(interaction) {
  const sent = await interaction.reply({ content: "Pinging...", fetchReply: true });
  const latency = sent.createdTimestamp - interaction.createdTimestamp;
  await interaction.editReply(
    `Pong! Latency: ${latency}ms | API: ${interaction.client.ws.ping}ms`
  );
}

module.exports = {
  data,
  execute,
  executeSlash,
  public: true
};