const config = require("../config");
const crypto = require("crypto");

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MediaGalleryBuilder,
  MessageFlags
} = require("discord.js");

function buildVerificationPanel() {
  return new ContainerBuilder()
    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        item => item.setURL("https://cdn.phototourl.com/free/2026-09-11-c764c11c-47b7-431c-bfc1-46e9fdde1dfc.png")
      )
    )

    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "# <:logo2:1547875517250936842> Verification"
      )
    )

    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )

    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "Verify your roblox account with your discord."
      )
    )

    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("variety:verification")
          .setLabel("Verify")
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
  if (!config.verificationChannelId) {
    return message.reply(
      "VERIFICATION_CHANNEL_ID isn't set in the environment."
    );
  }

  const channel = await message.guild.channels.fetch(
    config.verificationChannelId
  );

  if (!channel) {
    return message.reply(
      "I couldn't find the configured verification channel."
    );
  }

  await channel.send({
    components: [buildVerificationPanel()],
    flags: MessageFlags.IsComponentsV2
  });

  await message.reply(`Verification panel sent to ${channel}.`);
}

// discordUserId -> { robloxId, robloxName, code, expiresAt, attempts }
const pendingVerifications = new Map();

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CONFIRM_ATTEMPTS = 5;

/**
 * Main entry point for every "variety:verification*" interaction.
 * - Button click "variety:verification"          -> shows a modal asking for the Roblox username.
 * - Modal submit "variety:verification:modal"     -> looks the username up via Roblox's API and,
 *                                                     if found, asks the user to prove ownership.
 * - Button click "variety:verification:confirm"   -> re-checks the Roblox profile for the code.
 * - Button click "variety:verification:dock"      -> skips straight to Dock (docksys).
 *                    Any Roblox-side failure (not found, ownership never confirmed, API error)
 *                    also falls back to Dock automatically.
 *
 * Wire this up in your interaction router the same way the old
 * handleVerification was wired up (it already dispatches on interaction
 * type internally now, so no other changes are needed there).
 */
async function handleVerification(interaction) {
  if (interaction.isButton()) {
    if (interaction.customId === "variety:verification") {
      return handleVerificationButton(interaction);
    }
    if (interaction.customId === "variety:verification:confirm") {
      return handleVerificationConfirm(interaction);
    }
    if (interaction.customId === "variety:verification:dock") {
      return handleVerificationDockButton(interaction);
    }
    return;
  }

  if (interaction.isModalSubmit() && interaction.customId === "variety:verification:modal") {
    return handleVerificationModalSubmit(interaction);
  }
}

function buildRobloxUsernameModal() {
  return new ModalBuilder()
    .setCustomId("variety:verification:modal")
    .setTitle("Roblox Verification")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("robloxUsername")
          .setLabel("Your Roblox username")
          .setPlaceholder("e.g. Builderman")
          .setStyle(TextInputStyle.Short)
          .setMinLength(3)
          .setMaxLength(20)
          .setRequired(true)
      )
    );
}

async function handleVerificationButton(interaction) {
  if (!config.verifiedRoleId) {
    return interaction.reply({
      content: "Verification isn't configured yet. The verified role is missing.",
      ephemeral: true
    });
  }

  await interaction.showModal(buildRobloxUsernameModal());
}

async function handleVerificationModalSubmit(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const username = interaction.fields
    .getTextInputValue("robloxUsername")
    .trim();

  if (!username) {
    await interaction.editReply("Please enter a valid Roblox username.");
    return;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id);

  if (member.roles.cache.has(config.verifiedRoleId)) {
    await interaction.editReply("You are already verified.");
    return;
  }

  // Try to find the Roblox account directly first, no redirect needed.
  try {
    const robloxUser = await lookupRobloxUserByUsername(username);

    if (!robloxUser) {
      // Username lookup came back empty - fall back to Dock.
      await verifyWithDockFallback(interaction, member);
      return;
    }

    // If Dock already has this Discord user linked to a Roblox account,
    // use that as instant proof of ownership instead of the bio-code flow.
    const dockResult = await checkDockOwnership(interaction.user.id, interaction.guild.id);

    if (dockResult && dockResult.verified) {
      if (String(dockResult.robloxId) === String(robloxUser.id)) {
        await member.roles.add(
          config.verifiedRoleId,
          `Variety verification (Dock-confirmed Roblox: ${robloxUser.name}, ID: ${robloxUser.id})`
        );

        await interaction.editReply(
          `Verified! Dock confirms you're linked to Roblox user **${robloxUser.name}** (ID: ${robloxUser.id}).`
        );
        return;
      }

      // Dock has a different account on file - don't let the typed
      // username override that; refuse instead of allowing a bio-code bypass.
      await interaction.editReply({
        content:
          `Dock has you linked to a **different** Roblox account than the one you typed (ID: ${dockResult.robloxId}). ` +
          `If that's not the account you meant, this verification is denied for safety. ` +
          `If your Dock link is out of date, please update it there and try again.`,
        components: []
      });
      return;
    }

    const code = generateVerificationCode();

    pendingVerifications.set(interaction.user.id, {
      robloxId: robloxUser.id,
      robloxName: robloxUser.name,
      code,
      expiresAt: Date.now() + CODE_TTL_MS,
      attempts: 0
    });

    await interaction.editReply({
      content:
        `I found **${robloxUser.name}** (ID: ${robloxUser.id}). Before I verify you as this account, prove it's yours:\n\n` +
        `1. Go to your Roblox profile and edit your **About / bio**.\n` +
        `2. Paste this code anywhere in it: \`${code}\`\n` +
        `3. Save it, then click **I've added it** below.\n\n` +
        `You have 10 minutes. You can remove the code afterward.`,
      components: [buildConfirmRow()]
    });
  } catch (error) {
    console.error("Roblox lookup error:", error);
    // API error / lookup unavailable - fall back to Dock.
    await verifyWithDockFallback(interaction, member);
  }
}

function generateVerificationCode() {
  return `variety-${crypto.randomBytes(3).toString("hex")}`;
}

function buildConfirmRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("variety:verification:confirm")
      .setLabel("I've added it")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("variety:verification:dock")
      .setLabel("Use Dock instead")
      .setStyle(ButtonStyle.Secondary)
  );
}

async function handleVerificationConfirm(interaction) {
  await interaction.deferUpdate();

  const pending = pendingVerifications.get(interaction.user.id);

  if (!pending) {
    await interaction.editReply({
      content: "I don't have a pending verification for you. Click **Verify** again to start over.",
      components: []
    });
    return;
  }

  if (Date.now() > pending.expiresAt) {
    pendingVerifications.delete(interaction.user.id);
    await interaction.editReply({
      content: "That code expired. Click **Verify** again to get a new one.",
      components: []
    });
    return;
  }

  try {
    const description = await fetchRobloxDescription(pending.robloxId);

    if (description.includes(pending.code)) {
      pendingVerifications.delete(interaction.user.id);

      const member = await interaction.guild.members.fetch(interaction.user.id);
      await member.roles.add(
        config.verifiedRoleId,
        `Variety verification (Roblox: ${pending.robloxName}, ID: ${pending.robloxId})`
      );

      await interaction.editReply({
        content: `Verified! You're now linked to Roblox user **${pending.robloxName}** (ID: ${pending.robloxId}).`,
        components: []
      });
      return;
    }

    pending.attempts += 1;

    if (pending.attempts >= MAX_CONFIRM_ATTEMPTS) {
      pendingVerifications.delete(interaction.user.id);
      const member = await interaction.guild.members.fetch(interaction.user.id);
      await verifyWithDockFallback(interaction, member);
      return;
    }

    await interaction.editReply({
      content:
        `I couldn't find \`${pending.code}\` in that profile's About section yet. ` +
        `Make sure you saved it, then try again. (${pending.attempts}/${MAX_CONFIRM_ATTEMPTS} attempts)`,
      components: [buildConfirmRow()]
    });
  } catch (error) {
    console.error("Roblox description check error:", error);
    await interaction.editReply({
      content: "I couldn't reach Roblox to check your profile. Please try again in a moment.",
      components: [buildConfirmRow()]
    });
  }
}

async function handleVerificationDockButton(interaction) {
  await interaction.deferUpdate();
  pendingVerifications.delete(interaction.user.id);
  const member = await interaction.guild.members.fetch(interaction.user.id);
  await verifyWithDockFallback(interaction, member);
}

async function fetchRobloxDescription(robloxId) {
  const response = await fetch(`https://users.roblox.com/v1/users/${robloxId}`, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error(`Roblox API error ${response.status}`);
  }

  const data = await response.json();
  return data?.description ?? "";
}

async function lookupRobloxUserByUsername(username) {
  const response = await fetch("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      usernames: [username],
      excludeBannedUsers: true
    })
  });

  if (!response.ok) {
    throw new Error(`Roblox API error ${response.status}`);
  }

  const data = await response.json();
  const user = data?.data?.[0];

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    displayName: user.displayName
  };
}

async function verifyWithDockFallback(interaction, member) {
  if (!config.dock.apiKey) {
    await interaction.editReply({
      content: "That didn't work, and Dock verification isn't configured either. Please try again later.",
      components: []
    });
    return;
  }

  try {
    const result = await verifyWithDock({
      discordId: interaction.user.id,
      guildId: interaction.guild.id
    });

    if (!result.verified) {
      await interaction.editReply({
        content: "That didn't work, and you're not verified with Dock either. Please link your Roblox account with Dock first, then try again.",
        components: []
      });
      return;
    }

    await member.roles.add(config.verifiedRoleId, "Variety verification (via Dock)");

    await interaction.editReply({
      content: "Verification successful via Dock! Your verified role has been added.",
      components: []
    });
  } catch (error) {
    console.error("Dock verification error:", error);

    await interaction.editReply({
      content: "Verification is temporarily unavailable. Please try again later.",
      components: []
    });
  }
}

async function checkDockOwnership(discordId, guildId) {
  if (!config.dock.apiKey) {
    return null;
  }

  try {
    return await verifyWithDock({ discordId, guildId });
  } catch (error) {
    console.error("Dock ownership check error:", error);
    return null;
  }
}

async function verifyWithDock({ discordId, guildId }) {
  const url = new URL("/api/v1/public/discord-to-roblox", config.dock.apiUrl);

  url.searchParams.set("discordId", discordId);
  url.searchParams.set("guildId", guildId);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${config.dock.apiKey}`,
      Accept: "application/json"
    }
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(`Dock returned an invalid response. HTTP ${response.status}`);
  }

  if (!response.ok) {
    throw new Error(`Dock API error ${response.status}: ${JSON.stringify(data)}`);
  }

  const robloxId =
    data?.data?.robloxId ?? data?.robloxId ?? data?.resolved?.id;

  return {
    verified: Boolean(robloxId),
    robloxId: robloxId ?? null,
    data
  };
}

module.exports = {
  execute,
  handleVerification,
  buildVerificationPanel
};