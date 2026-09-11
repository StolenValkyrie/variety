const config = require("../config");

const {
  ChannelType,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags
} = require("discord.js");

async function setupHoneypot(guild) {
  let channel = guild.channels.cache.find(
    channel =>
      channel.type === ChannelType.GuildText &&
      channel.name === config.honeypot.channelName
  );

  if (!channel) {
    channel = await guild.channels.create({
      name: config.honeypot.channelName,
      type: ChannelType.GuildText,
      reason: "Variety honeypot setup"
    });

    console.log(`Created #${config.honeypot.channelName} in ${guild.name}`);
  }

  await sendWarning(channel);

  return channel;
}

async function sendWarning(channel) {
  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ${config.honeypot.warningTitle}`)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(config.honeypot.warningText)
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "Messages sent will lead to you being softbanned."
      )
    );

  await channel.send({
    components: [container],
    flags: MessageFlags.IsComponentsV2
  });
}

async function handleMessage(message) {
  if (!message.guild) return false;

  if (
    message.channel.name !== config.honeypot.channelName ||
    message.channel.type !== ChannelType.GuildText
  ) {
    return false;
  }

  if (message.author.bot) {
    return true;
  }

  // Don't punish server owners.
  if (message.author.id === message.guild.ownerId) {
    return true;
  }

  try {
    // Delete the triggering message first.
    await message.delete().catch(() => {});

    /*
     * Softban:
     * Ban the member and remove recent messages,
     * then immediately unban them.
     */
    await message.guild.members.ban(message.author.id, {
      deleteMessageSeconds: config.honeypot.deleteMessageSeconds,
      reason: "Variety honeypot triggered"
    });

    await message.guild.members.unban(
      message.author.id,
      "Variety honeypot softban"
    );

    await logAction(message);

    console.log(
      `[HONEYPOT] Softbanned ${message.author.tag} (${message.author.id})`
    );
  } catch (error) {
    console.error(`Honeypot action failed for ${message.author.tag}:`, error);
  }

  return true;
}

async function logAction(message) {
  const logChannel = message.guild.channels.cache.find(
    channel =>
      channel.type === ChannelType.GuildText &&
      channel.name === config.honeypot.logChannelName
  );

  if (!logChannel) return;

  await logChannel.send(
    [
      "**Variety Honeypot**",
      `User: ${message.author.tag}`,
      `ID: ${message.author.id}`,
      `Channel: #${config.honeypot.channelName}`,
      "Action: Softban",
      "Reason: Honeypot triggered"
    ].join("\n")
  );
}

async function handleHoneypotButton(interaction) {
  await interaction.reply({
    content:
      `Honeypot channel: #${config.honeypot.channelName}\n` +
      "The honeypot is automatically initialized when the bot starts.",
    ephemeral: true
  });
}

async function execute(message) {
  const channel = await setupHoneypot(message.guild);
  await message.reply(`Honeypot ready: ${channel}`);
}

module.exports = {
  execute,
  setupHoneypot,
  handleMessage,
  handleHoneypotButton
};