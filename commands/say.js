const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

const data = new SlashCommandBuilder()
  .setName("say")
  .setDescription("Make the bot say something.")
  .addStringOption(option =>
    option.setName("message").setDescription("The message to send").setRequired(true)
  )
  .addChannelOption(option =>
    option
      .setName("channel")
      .setDescription("Channel to send in (defaults to the current channel)")
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

async function execute(message, args) {
  const content = args.join(" ");

  if (!content) {
    return message.reply("Usage: `!say <message>`");
  }

  await message.channel.send(content);
  await message.delete().catch(() => {});
}

async function executeSlash(interaction) {
  const content = interaction.options.getString("message", true);
  const channel = interaction.options.getChannel("channel") || interaction.channel;

  if (!channel.isTextBased()) {
    return interaction.reply({
      content: "That channel isn't a text channel.",
      ephemeral: true
    });
  }

  await channel.send(content);
  await interaction.reply({ content: `Sent to ${channel}.`, ephemeral: true });
}

module.exports = { data, execute, executeSlash };