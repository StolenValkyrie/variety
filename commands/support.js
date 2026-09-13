const config = require("../config");

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags
} = require("discord.js");

// Ticket state lives in each ticket channel's topic, so it survives a
// restart without needing a database:
//   ticket-owner:<userId>|claimed-by:<staffId or "none">|panel-msg:<messageId or "none">
function parseTopic(topic) {
  const ownerMatch = /ticket-owner:(\d+)/.exec(topic || "");
  const claimMatch = /claimed-by:(\d+|none)/.exec(topic || "");
  const msgMatch = /panel-msg:(\d+)/.exec(topic || "");

  return {
    ownerId: ownerMatch ? ownerMatch[1] : null,
    claimedBy: claimMatch && claimMatch[1] !== "none" ? claimMatch[1] : null,
    panelMessageId: msgMatch ? msgMatch[1] : null
  };
}

function buildTopic(ownerId, claimedBy, panelMessageId) {
  return `ticket-owner:${ownerId}|claimed-by:${claimedBy || "none"}|panel-msg:${panelMessageId || "none"}`;
}

function isStaff(member) {
  if (config.support.staffRoleId) {
    return member.roles.cache.has(config.support.staffRoleId);
  }

  return member.permissions.has(PermissionFlagsBits.ManageGuild);
}

function sanitizeChannelName(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90) || "ticket";
}

function ticketButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("variety:ticket:claim")
      .setLabel("Claim")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("variety:ticket:unclaim")
      .setLabel("Unclaim")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("variety:ticket:rename")
      .setLabel("Rename")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("variety:ticket:close")
      .setLabel("Close")
      .setStyle(ButtonStyle.Danger)
  );
}

// Reasons live in memory (keyed by channel ID) so claim/unclaim edits can
// redraw the panel without re-parsing it. If the bot restarts, the fallback
// in extractReasonFromPanel() re-reads it off the existing message instead.
const ticketReasons = new Map();

function buildTicketPanel({ ownerId, reason, claimedBy, staffMention }) {
  const container = new ContainerBuilder();

  const pingLine = [`<@${ownerId}>`, staffMention].filter(Boolean).join(" ");

  if (pingLine) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(pingLine)
    );
  }

  return container
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("# Support Ticket")
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Opened by:** <@${ownerId}>`)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Status:** ${claimedBy ? `Claimed by <@${claimedBy}>` : "Unclaimed"}`
      )
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Reason:**\n${reason || "No reason provided."}`
      )
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addActionRowComponents(ticketButtons());
}

function buildSupportPanel() {
  return new ContainerBuilder()
    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(item =>
        item.setURL("https://cdn.phototourl.com/free/2026-09-11-35fb5be4-a407-4efc-b11a-d96a0424a549.png")
      )
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "# <:logo2:1547875517250936842> Support"
      )
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "Use the tickets to recieve help from staff! Misuse will lead to your ticket rights being revoked."
      )
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("variety:ticket:open")
          .setLabel("Open Ticket")
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

const data = new SlashCommandBuilder()
  .setName("support")
  .setDescription("Post the support ticket panel.")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

async function execute(message) {
  const channel = await message.guild.channels.fetch(
    config.support.panelChannelId
  );

  if (!channel) {
    return message.reply("I couldn't find the configured support channel.");
  }

  await channel.send({
    components: [buildSupportPanel()],
    flags: MessageFlags.IsComponentsV2
  });

  await message.reply(`Support panel sent to ${channel}.`);
}

async function executeSlash(interaction) {
  const channel = await interaction.guild.channels.fetch(
    config.support.panelChannelId
  );

  if (!channel) {
    return interaction.reply({
      content: "I couldn't find the configured support channel.",
      ephemeral: true
    });
  }

  await channel.send({
    components: [buildSupportPanel()],
    flags: MessageFlags.IsComponentsV2
  });

  await interaction.reply({
    content: `Support panel sent to ${channel}.`,
    ephemeral: true
  });
}

function findExistingTicket(guild, userId) {
  return guild.channels.cache.find(channel => {
    if (channel.type !== ChannelType.GuildText) return false;
    const { ownerId } = parseTopic(channel.topic);
    return ownerId === userId;
  });
}

function ticketOverwrites(guild, user) {
  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory
      ]
    }
  ];

  if (config.support.staffRoleId) {
    overwrites.push({
      id: config.support.staffRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory
      ]
    });
  }

  return overwrites;
}

// Shared by the button/modal flow and the !ticket prefix command.
async function createTicketChannel(guild, user, reason) {
  const ticketChannel = await guild.channels.create({
    name: `ticket-${sanitizeChannelName(user.username)}`,
    type: ChannelType.GuildText,
    parent: config.support.ticketCategoryId || undefined,
    topic: buildTopic(user.id, null, null),
    permissionOverwrites: ticketOverwrites(guild, user),
    reason: `Ticket opened by ${user.tag}`
  });

  const staffMention = config.support.staffRoleId
    ? `<@&${config.support.staffRoleId}>`
    : "";

  ticketReasons.set(ticketChannel.id, reason);

  const panelMessage = await ticketChannel.send({
    components: [
      buildTicketPanel({
        ownerId: user.id,
        reason,
        claimedBy: null,
        staffMention
      })
    ],
    flags: MessageFlags.IsComponentsV2
  });

  await ticketChannel.setTopic(buildTopic(user.id, null, panelMessage.id));

  return ticketChannel;
}

function extractReasonFromPanel(message) {
  try {
    for (const container of message.components) {
      for (const component of container.components || []) {
        if (component.content && component.content.startsWith("**Reason:**")) {
          return component.content.replace("**Reason:**", "").trim();
        }
      }
    }
  } catch (error) {
    console.error("Failed to read reason off existing ticket panel:", error);
  }

  return null;
}

async function updateTicketPanel(channel, { ownerId, claimedBy, panelMessageId }) {
  if (!panelMessageId) return;

  try {
    const message = await channel.messages.fetch(panelMessageId);
    const reason =
      ticketReasons.get(channel.id) ??
      extractReasonFromPanel(message) ??
      "No reason provided.";

    const staffMention = config.support.staffRoleId
      ? `<@&${config.support.staffRoleId}>`
      : "";

    await message.edit({
      components: [
        buildTicketPanel({ ownerId, reason, claimedBy, staffMention })
      ],
      flags: MessageFlags.IsComponentsV2
    });
  } catch (error) {
    console.error("Failed to update ticket panel:", error);
  }
}

async function handleOpenTicketButton(interaction) {
  const existing = findExistingTicket(interaction.guild, interaction.user.id);

  if (existing) {
    return interaction.reply({
      content: `You already have an open ticket: ${existing}`,
      ephemeral: true
    });
  }

  const modal = new ModalBuilder()
    .setCustomId("variety:ticket:open-modal")
    .setTitle("Open a Ticket");

  const reasonInput = new TextInputBuilder()
    .setCustomId("reason")
    .setLabel("Reason for opening a ticket")
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));

  await interaction.showModal(modal);
}

async function submitOpenTicketModal(interaction) {
  const existing = findExistingTicket(interaction.guild, interaction.user.id);

  if (existing) {
    return interaction.reply({
      content: `You already have an open ticket: ${existing}`,
      ephemeral: true
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const reason = interaction.fields.getTextInputValue("reason").trim();

  const ticketChannel = await createTicketChannel(
    interaction.guild,
    interaction.user,
    reason
  );

  await interaction.editReply(`Ticket created: ${ticketChannel}`);
}

// "! version" - open a ticket straight from a prefix command instead of the
// button/modal, e.g. `!ticket Can't join the server`.
async function openTicketFromMessage(message, args) {
  const existing = findExistingTicket(message.guild, message.author.id);

  if (existing) {
    return message.reply(`You already have an open ticket: ${existing}`);
  }

  const reason = args.join(" ").trim();

  if (!reason) {
    return message.reply(
      `Please include a reason, e.g. \`${config.prefix}ticket Can't join the server\`.`
    );
  }

  const ticketChannel = await createTicketChannel(
    message.guild,
    message.author,
    reason
  );

  await message.reply(`Ticket created: ${ticketChannel}`);
}

async function claimTicket(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({
      content: "Only staff can claim tickets.",
      ephemeral: true
    });
  }

  const { ownerId, claimedBy, panelMessageId } = parseTopic(interaction.channel.topic);

  if (!ownerId) {
    return interaction.reply({
      content: "This doesn't look like a ticket channel.",
      ephemeral: true
    });
  }

  if (claimedBy) {
    return interaction.reply({
      content:
        claimedBy === interaction.user.id
          ? "You've already claimed this ticket."
          : `This ticket is already claimed by <@${claimedBy}>.`,
      ephemeral: true
    });
  }

  await interaction.channel.setTopic(
    buildTopic(ownerId, interaction.user.id, panelMessageId)
  );

  await updateTicketPanel(interaction.channel, {
    ownerId,
    claimedBy: interaction.user.id,
    panelMessageId
  });

  await interaction.reply(`Ticket claimed by ${interaction.user}.`);
}

async function unclaimTicket(interaction) {
  const { ownerId, claimedBy, panelMessageId } = parseTopic(interaction.channel.topic);

  if (!ownerId) {
    return interaction.reply({
      content: "This doesn't look like a ticket channel.",
      ephemeral: true
    });
  }

  if (!claimedBy) {
    return interaction.reply({
      content: "This ticket isn't claimed by anyone yet.",
      ephemeral: true
    });
  }

  const canUnclaim =
    claimedBy === interaction.user.id || isStaff(interaction.member);

  if (!canUnclaim) {
    return interaction.reply({
      content: "Only the staff member who claimed this ticket (or other staff) can unclaim it.",
      ephemeral: true
    });
  }

  await interaction.channel.setTopic(buildTopic(ownerId, null, panelMessageId));

  await updateTicketPanel(interaction.channel, {
    ownerId,
    claimedBy: null,
    panelMessageId
  });

  await interaction.reply(`Ticket unclaimed by ${interaction.user}.`);
}

async function showRenameModal(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({
      content: "Only staff can rename tickets.",
      ephemeral: true
    });
  }

  const modal = new ModalBuilder()
    .setCustomId("variety:ticket:rename-modal")
    .setTitle("Rename Ticket");

  const nameInput = new TextInputBuilder()
    .setCustomId("new-name")
    .setLabel("New channel name")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(90)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(nameInput));

  await interaction.showModal(modal);
}

async function submitRenameModal(interaction) {
  const { ownerId } = parseTopic(interaction.channel.topic);

  if (!ownerId) {
    return interaction.reply({
      content: "This doesn't look like a ticket channel.",
      ephemeral: true
    });
  }

  const rawName = interaction.fields.getTextInputValue("new-name");
  const newName = sanitizeChannelName(rawName);

  await interaction.channel.setName(newName);
  await interaction.reply(`Ticket renamed to **${newName}**.`);
}

async function closeTicket(interaction) {
  const { ownerId } = parseTopic(interaction.channel.topic);

  if (!ownerId) {
    return interaction.reply({
      content: "This doesn't look like a ticket channel.",
      ephemeral: true
    });
  }

  const canClose =
    interaction.user.id === ownerId || isStaff(interaction.member);

  if (!canClose) {
    return interaction.reply({
      content: "Only the ticket owner or staff can close this ticket.",
      ephemeral: true
    });
  }

  await interaction.reply("Closing this ticket in 5 seconds...");

  ticketReasons.delete(interaction.channel.id);

  setTimeout(() => {
    interaction.channel.delete("Ticket closed").catch(() => {});
  }, 5000);
}

async function handleTicketButton(interaction) {
  const action = interaction.customId.split(":")[2];

  switch (action) {
    case "open":
      return handleOpenTicketButton(interaction);
    case "claim":
      return claimTicket(interaction);
    case "unclaim":
      return unclaimTicket(interaction);
    case "rename":
      return showRenameModal(interaction);
    case "close":
      return closeTicket(interaction);
    default:
      return;
  }
}

module.exports = {
  data,
  execute,
  executeSlash,
  buildSupportPanel,
  handleTicketButton,
  submitRenameModal,
  submitOpenTicketModal,
  openTicketFromMessage
};