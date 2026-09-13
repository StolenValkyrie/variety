const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require("discord.js");

const data = new SlashCommandBuilder()
  .setName("embedsay")
  .setDescription("Make the bot send a plain container message.")
  .addStringOption(option =>
    option.setName("description").setDescription("Message body text").setRequired(true)
  )
  .addStringOption(option =>
    option.setName("title").setDescription("Message title").setRequired(false)
  )
  .addChannelOption(option =>
    option
      .setName("channel")
      .setDescription("Channel to send in (defaults to the current channel)")
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

function buildContainer(title, description) {
  const container = new ContainerBuilder();

  if (title) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ${title}`)
    );
  }

  return container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(description)
  );
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

  await message.channel.send({
    components: [buildContainer(title, description)],
    flags: MessageFlags.IsComponentsV2
  });
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

  await channel.send({
    components: [buildContainer(title, description)],
    flags: MessageFlags.IsComponentsV2
  });
  await interaction.reply({ content: `Sent to ${channel}.`, ephemeral: true });
}

module.exports = { data, execute, executeSlash };