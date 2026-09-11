const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

const data = new SlashCommandBuilder()
  .setName("kick")
  .setDescription("Kick a member from the server.")
  .addUserOption(option =>
    option.setName("user").setDescription("The member to kick").setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName("reason")
      .setDescription("Reason for the kick")
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);

async function execute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
    return message.reply(
      "You need the **Kick Members** permission to use this command."
    );
  }

  const mentioned = message.mentions.members.first();
  const target =
    mentioned ||
    (args[0]
      ? await message.guild.members.fetch(args[0]).catch(() => null)
      : null);

  if (!target) {
    return message.reply("Usage: `!kick @user [reason]`");
  }

  const reason = args.slice(1).join(" ") || "No reason provided.";

  if (target.id === message.author.id) {
    return message.reply("You can't kick yourself.");
  }

  if (!target.kickable) {
    return message.reply(
      "I can't kick that member — they may have a higher role than me, or be the server owner."
    );
  }

  try {
    await target.kick(reason);
    await message.reply(`Kicked **${target.user.tag}**. Reason: ${reason}`);
  } catch (error) {
    console.error("Kick command failed:", error);
    await message.reply("Something went wrong while trying to kick that member.");
  }
}

async function executeSlash(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
    return interaction.reply({
      content: "You need the **Kick Members** permission to use this command.",
      ephemeral: true
    });
  }

  const user = interaction.options.getUser("user", true);
  const reason = interaction.options.getString("reason") || "No reason provided.";

  if (user.id === interaction.user.id) {
    return interaction.reply({
      content: "You can't kick yourself.",
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

  if (!target.kickable) {
    return interaction.reply({
      content:
        "I can't kick that member — they may have a higher role than me, or be the server owner.",
      ephemeral: true
    });
  }

  try {
    await target.kick(reason);
    await interaction.reply(`Kicked **${target.user.tag}**. Reason: ${reason}`);
  } catch (error) {
    console.error("Kick slash command failed:", error);
    await interaction.reply({
      content: "Something went wrong while trying to kick that member.",
      ephemeral: true
    });
  }
}

module.exports = { data, execute, executeSlash };