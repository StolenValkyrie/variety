const config = require("../config");

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} = require("discord.js");

const DASHBOARD_URL =
  "https://discord.com/channels/1547565579832135754/1547565813383569418";

const WELCOME_CHANNEL_ID = "1547566249993576499";

function buildWelcomePanel(member) {
  return new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "# <:logo2:1547875517250936842>ariety"
      )
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# Welcome to Variety (${member})! We appreciate you joining!`
      )
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        // Disabled - just displays the member count, not a real action.
        new ButtonBuilder()
          .setCustomId("variety:welcome:membercount")
          .setLabel(`${member.guild.memberCount}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        // Link button - opens the channel directly, no interaction handler needed.
        new ButtonBuilder()
          .setLabel("Dashboard")
          .setStyle(ButtonStyle.Link)
          .setURL(DASHBOARD_URL)
      )
    );
}

const data = new SlashCommandBuilder()
  .setName("welcome")
  .setDescription("Send a test welcome panel for yourself.")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

async function execute(message) {
  await message.channel.send({
    components: [buildWelcomePanel(message.member)],
    flags: MessageFlags.IsComponentsV2
  });
}

async function executeSlash(interaction) {
  await interaction.channel.send({
    components: [buildWelcomePanel(interaction.member)],
    flags: MessageFlags.IsComponentsV2
  });

  await interaction.reply({ content: "Sent.", ephemeral: true });
}

async function sendWelcomePanel(member) {
  const channel = await member.guild.channels
    .fetch(WELCOME_CHANNEL_ID)
    .catch(() => null);

  if (!channel) {
    console.error("Welcome channel not found:", WELCOME_CHANNEL_ID);
    return;
  }

  await channel.send({
    components: [buildWelcomePanel(member)],
    flags: MessageFlags.IsComponentsV2
  });
}

module.exports = {
  data,
  execute,
  executeSlash,
  buildWelcomePanel,
  sendWelcomePanel
};