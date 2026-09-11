const { SlashCommandBuilder } = require("discord.js");
const config = require("../config");

function buildSupportMessage() {
  const channelMention = config.supportChannelId
    ? `<#${config.supportChannelId}>`
    : "the support channel";

  return [
    "**Need help?**",
    config.support.message,
    `Head to ${channelMention} and let staff know what's going on.`
  ].join("\n");
}

const data = new SlashCommandBuilder()
  .setName("support")
  .setDescription("Get help from the server's support team.");

async function execute(message) {
  await message.reply(buildSupportMessage());
}

async function executeSlash(interaction) {
  await interaction.reply({ content: buildSupportMessage(), ephemeral: true });
}

module.exports = {
  data,
  execute,
  executeSlash,
  public: true
};