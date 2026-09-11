const config = require("../config");

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MediaGalleryBuilder,
  MessageFlags
} = require("discord.js");

const dashboardConfig = {
  title: "<:logo2:1547875517250936842> Dashboard",
  description: "Below is our rules & information.",
  rules: [
    "Be respectful to everyone.",
    "No spam, flooding, or excessive self-promotion.",
    "No harassment, hate speech, or discrimination.",
    "Keep content appropriate for the server.",
    "Follow Discord's Terms of Service and Community Guidelines.",
    "Listen to staff and follow channel-specific rules."
  ],
  info:
    "Welcome to Variety. Check the appropriate channels for announcements, updates, and community discussions. If you need help, contact a member of staff."
};

function buildDashboard() {
  return new ContainerBuilder()
    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(item =>
        item.setURL(config.banners.top)
      )
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ${dashboardConfig.title}`)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(dashboardConfig.description)
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )

    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("variety:rules")
          .setLabel("Rules")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("variety:info")
          .setLabel("Info")
          .setStyle(ButtonStyle.Secondary)
      )
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(item =>
        item.setURL(config.banners.bottom)
      )
    );
}

async function execute(message) {
  if (!config.dashboardChannelId) {
    return message.reply("DASHBOARD_CHANNEL_ID isn't set in the environment.");
  }

  const channel = await message.guild.channels.fetch(config.dashboardChannelId);

  if (!channel) {
    return message.reply("I couldn't find the configured dashboard channel.");
  }

  await channel.send({
    components: [buildDashboard()],
    flags: MessageFlags.IsComponentsV2
  });

  await message.reply(`Dashboard sent to ${channel}.`);
}

async function handleDashboardButton(interaction) {
  if (interaction.customId === "variety:rules") {
    return interaction.reply({
      content: `Server Rules\n\n${dashboardConfig.rules
        .map((rule, index) => `${index + 1}. ${rule}`)
        .join("\n")}`,
      ephemeral: true
    });
  }

  if (interaction.customId === "variety:info") {
    return interaction.reply({
      content: `Server Information\n\n${dashboardConfig.info}`,
      ephemeral: true
    });
  }
}

module.exports = {
  execute,
  handleDashboardButton,
  buildDashboard
};