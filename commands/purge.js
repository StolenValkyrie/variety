const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

const data = new SlashCommandBuilder()
  .setName("purge")
  .setDescription("Bulk delete recent messages in this channel.")
  .addIntegerOption(option =>
    option
      .setName("amount")
      .setDescription("How many messages to delete (1-100)")
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(100)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

async function execute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
    return message.reply(
      "You need the **Manage Messages** permission to use this command."
    );
  }

  const amount = Number(args[0]);

  if (!Number.isInteger(amount) || amount < 1 || amount > 100) {
    return message.reply("Usage: `!purge <1-100>`");
  }

  try {
    // +1 to also remove the command message itself.
    const deleted = await message.channel.bulkDelete(amount + 1, true);
    const confirmation = await message.channel.send(
      `Deleted ${deleted.size - 1} message(s).`
    );

    setTimeout(() => confirmation.delete().catch(() => {}), 5000);
  } catch (error) {
    console.error("Purge command failed:", error);
    await message.reply(
      "Something went wrong — messages older than 14 days can't be bulk deleted."
    );
  }
}

async function executeSlash(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
    return interaction.reply({
      content: "You need the **Manage Messages** permission to use this command.",
      ephemeral: true
    });
  }

  const amount = interaction.options.getInteger("amount", true);

  try {
    const deleted = await interaction.channel.bulkDelete(amount, true);
    await interaction.reply({
      content: `Deleted ${deleted.size} message(s).`,
      ephemeral: true
    });
  } catch (error) {
    console.error("Purge slash command failed:", error);
    await interaction.reply({
      content:
        "Something went wrong — messages older than 14 days can't be bulk deleted.",
      ephemeral: true
    });
  }
}

module.exports = { data, execute, executeSlash };