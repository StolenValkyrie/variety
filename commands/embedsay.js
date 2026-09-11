const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");

const data = new SlashCommandBuilder()
  .setName("embedsay")
  .setDescription("Make the bot send a plain embed (no colour).")
  .addStringOption(option =>
    option.setName("description").setDescription("Embed body text").setRequired(true)
  )
  .addStringOption(option =>
    option.setName("title").setDescription("Embed title").setRequired(false)
  )
  .addChannelOption(option =>
    option
      .setName("channel")
      .setDescription("Channel to send in (defaults to the current channel)")
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

// No .setColor() call anywhere here on purpose — the embed intentionally
// carries no accent colour.
function buildEmbed(title, description) {
  const embed = new EmbedBuilder().setDescription(description);
  if (title) embed.setTitle(title);
  return embed;
}

async function execute(message, args) {
  const raw = args.join(" ");

  if (!raw) {
    return message.reply(
      "Usage: `!embedsay <title> | <description>` or `!embedsay <description>`"
    );
  }

  let title = null;
  let description = raw;

  if (raw.includes("|")) {
    const [titlePart, ...rest] = raw.split("|");
    title = titlePart.trim();
    description = rest.join("|").trim();
  }

  await message.channel.send({ embeds: [buildEmbed(title, description)] });
  await message.delete().catch(() => {});
}

async function executeSlash(interaction) {
  const title = interaction.options.getString("title");
  const description = interaction.options.getString("description", true);
  const channel = interaction.options.getChannel("channel") || interaction.channel;

  if (!channel.isTextBased()) {
    return interaction.reply({
      content: "That channel isn't a text channel.",
      ephemeral: true
    });
  }

  await channel.send({ embeds: [buildEmbed(title, description)] });
  await interaction.reply({ content: `Sent to ${channel}.`, ephemeral: true });
}

module.exports = { data, execute, executeSlash };