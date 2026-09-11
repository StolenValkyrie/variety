const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

const data = new SlashCommandBuilder()
  .setName("ban")
  .setDescription("Ban a member from the server.")
  .addUserOption(option =>
    option.setName("user").setDescription("The member to ban").setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName("reason")
      .setDescription("Reason for the ban")
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

async function execute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
    return message.reply(
      "You need the **Ban Members** permission to use this command."
    );
  }

  const mentioned = message.mentions.members.first();
  const target =
    mentioned ||
    (args[0]
      ? await message.guild.members.fetch(args[0]).catch(() => null)
      : null);

  if (!target) {
    return message.reply("Usage: `!ban @user [reason]`");
  }

  const reasonArgs = mentioned ? args.slice(1) : args.slice(1);
  const reason = reasonArgs.join(" ") || "No reason provided.";

  if (target.id === message.author.id) {
    return message.reply("You can't ban yourself.");
  }

  if (!target.bannable) {
    return message.reply(
      "I can't ban that member — they may have a higher role than me, or be the server owner."
    );
  }

  try {
    await target.ban({ reason });
    await message.reply(`Banned **${target.user.tag}**. Reason: ${reason}`);
  } catch (error) {
    console.error("Ban command failed:", error);
    await message.reply("Something went wrong while trying to ban that member.");
  }
}

async function executeSlash(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
    return interaction.reply({
      content: "You need the **Ban Members** permission to use this command.",
      ephemeral: true
    });
  }

  const user = interaction.options.getUser("user", true);
  const reason = interaction.options.getString("reason") || "No reason provided.";

  if (user.id === interaction.user.id) {
    return interaction.reply({
      content: "You can't ban yourself.",
      ephemeral: true
    });
  }

  const target = await interaction.guild.members.fetch(user.id).catch(() => null);

  if (!target) {
    return interaction.reply({
      content: "I couldn't find that member in this server.",
      ephemeral: true
    });
  }

  if (!target.bannable) {
    return interaction.reply({
      content:
        "I can't ban that member — they may have a higher role than me, or be the server owner.",
      ephemeral: true
    });
  }

  try {
    await target.ban({ reason });
    await interaction.reply(`Banned **${target.user.tag}**. Reason: ${reason}`);
  } catch (error) {
    console.error("Ban slash command failed:", error);
    await interaction.reply({
      content: "Something went wrong while trying to ban that member.",
      ephemeral: true
    });
  }
}

module.exports = { data, execute, executeSlash };