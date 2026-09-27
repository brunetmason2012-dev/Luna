require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  SlashCommandBuilder,
  REST,
  Routes,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const fs = require("fs");
const path = require("path");

/* =========================================================
   🌙 LUNA
   Your community, beautifully managed.
   Single-file Discord bot
========================================================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const DATA_FILE = path.join(__dirname, "luna-data.json");

let data = {
  guilds: {},
  users: {},
  giveaways: {},
  events: {}
};

if (fs.existsSync(DATA_FILE)) {
  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    console.log("⚠️ Could not read luna-data.json. Starting fresh.");
  }
}

function save() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getGuild(guildId) {
  if (!data.guilds[guildId]) {
    data.guilds[guildId] = {
      welcomeChannel: null,
      goodbyeChannel: null,
      welcomeEnabled: false,
      autorole: null,

      ticketCategory: null,
      ticketStaffRole: null,
      ticketPanelChannel: null,

      economyEnabled: false,
      economyDaily: 500,

      levelEnabled: false,

      logChannel: null,

      verificationChannel: null,
      verificationRole: null
    };

    save();
  }

  return data.guilds[guildId];
}

function getUser(guildId, userId) {
  const key = `${guildId}_${userId}`;

  if (!data.users[key]) {
    data.users[key] = {
      coins: 0,
      xp: 0,
      level: 1,
      lastDaily: 0
    };

    save();
  }

  return data.users[key];
}

/* =========================================================
   EMBEDS
========================================================= */

function lunaEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(0xe8a9c9)
    .setTitle(`🌙 ${title}`)
    .setDescription(description)
    .setFooter({
      text: "Luna • Your community, beautifully managed."
    })
    .setTimestamp();
}

function errorEmbed(text) {
  return new EmbedBuilder()
    .setColor(0xed6a7a)
    .setTitle("🌙 Luna")
    .setDescription(`❌ ${text}`);
}

/* =========================================================
   COMMANDS
========================================================= */

const commands = [

  new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Open the Luna setup panel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Check your Luna balance."),

  new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Collect your daily Luna coins."),

  new SlashCommandBuilder()
    .setName("pay")
    .setDescription("Give coins to another member.")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Member to pay")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("amount")
        .setDescription("Amount of coins")
        .setMinValue(1)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Check your Luna level."),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member.")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Member")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription("Reason")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Delete messages.")
    .addIntegerOption(option =>
      option
        .setName("amount")
        .setDescription("Number of messages")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName("lock")
    .setDescription("Lock the current channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder()
    .setName("unlock")
    .setDescription("Unlock the current channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Create a giveaway.")
    .addStringOption(option =>
      option
        .setName("prize")
        .setDescription("Giveaway prize")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("minutes")
        .setDescription("Duration in minutes")
        .setMinValue(1)
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("winners")
        .setDescription("Number of winners")
        .setMinValue(1)
        .setMaxValue(20)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName("event")
    .setDescription("Create a community event.")
    .addStringOption(option =>
      option
        .setName("name")
        .setDescription("Event name")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("description")
        .setDescription("Event description")
        .setRequired(true)
    )
    .setStringOption(option =>
      option
        .setName("date")
        .setDescription("Date/time text")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

].map(command => command.toJSON());

/* =========================================================
   READY
========================================================= */

client.once("ready", async () => {

  console.log("");
  console.log("🌙 ===========================");
  console.log(`🌙 Luna online as ${client.user.tag}`);
  console.log(`🌙 Servers: ${client.guilds.cache.size}`);
  console.log("🌙 ===========================");
  console.log("");

  client.user.setPresence({
    activities: [
      {
        name: "your community 🎀",
        type: 3
      }
    ],
    status: "online"
  });

  try {

    const rest = new REST({ version: "10" })
      .setToken(process.env.DISCORD_TOKEN);

    await rest.put(
      Routes.applicationCommands(client.user.id),
      {
        body: commands
      }
    );

    console.log("✅ Slash commands registered.");

  } catch (error) {
    console.error("❌ Command registration error:", error);
  }

});

/* =========================================================
   WELCOME
========================================================= */

client.on("guildMemberAdd", async member => {

  const config = getGuild(member.guild.id);

  if (config.autorole) {

    const role = member.guild.roles.cache.get(config.autorole);

    if (role) {
      try {
        await member.roles.add(role);
      } catch {}
    }

  }

  if (!config.welcomeEnabled || !config.welcomeChannel) return;

  const channel = member.guild.channels.cache.get(
    config.welcomeChannel
  );

  if (!channel) return;

  const embed = lunaEmbed(
    "Welcome! 🎀",
    `Welcome ${member} to **${member.guild.name}**!\n\nWe're happy to have you here. Enjoy your stay! ✨`
  );

  embed.setThumbnail(member.user.displayAvatarURL());

  channel.send({
    content: `Welcome ${member}! 🌙`,
    embeds: [embed]
  });

});

/* =========================================================
   GOODBYE
========================================================= */

client.on("guildMemberRemove", async member => {

  const config = getGuild(member.guild.id);

  if (!config.goodbyeChannel) return;

  const channel = member.guild.channels.cache.get(
    config.goodbyeChannel
  );

  if (!channel) return;

  const embed = lunaEmbed(
    "Goodbye 💗",
    `**${member.user.username}** has left the server.\n\nWe hope to see you again!`
  );

  channel.send({
    embeds: [embed]
  });

});

/* =========================================================
   LEVEL SYSTEM
========================================================= */

client.on("messageCreate", async message => {

  if (!message.guild) return;
  if (message.author.bot) return;

  const config = getGuild(message.guild.id);

  if (!config.levelEnabled) return;

  const user = getUser(
    message.guild.id,
    message.author.id
  );

  const gainedXP = Math.floor(Math.random() * 8) + 5;

  user.xp += gainedXP;

  const requiredXP = user.level * 100;

  if (user.xp >= requiredXP) {

    user.xp -= requiredXP;
    user.level++;

    const embed = lunaEmbed(
      "Level Up! ✨",
      `${message.author}, you've reached **Level ${user.level}**! 🎀`
    );

    message.channel.send({
      content: `${message.author}`,
      embeds: [embed]
    });

  }

  save();

});

/* =========================================================
   INTERACTIONS
========================================================= */

client.on("interactionCreate", async interaction => {

  try {

    /* ================= COMMANDS ================= */

    if (interaction.isChatInputCommand()) {

      const config = getGuild(interaction.guild.id);

      /* SETUP */

      if (interaction.commandName === "setup") {

        const embed = lunaEmbed(
          "Luna Setup",
          "Configure Luna using the buttons below.\n\nChoose a system to get started. 🌙"
        );

        const row1 = new ActionRowBuilder().addComponents(

          new ButtonBuilder()
            .setCustomId("setup_welcome")
            .setLabel("Welcome")
            .setEmoji("👋")
            .setStyle(ButtonStyle.Secondary),

          new ButtonBuilder()
            .setCustomId("setup_tickets")
            .setLabel("Tickets")
            .setEmoji("🎫")
            .setStyle(ButtonStyle.Secondary),

          new ButtonBuilder()
            .setCustomId("setup_economy")
            .setLabel("Economy")
            .setEmoji("💰")
            .setStyle(ButtonStyle.Secondary)

        );

        const row2 = new ActionRowBuilder().addComponents(

          new ButtonBuilder()
            .setCustomId("setup_giveaways")
            .setLabel("Giveaways")
            .setEmoji("🎉")
            .setStyle(ButtonStyle.Secondary),

          new ButtonBuilder()
            .setCustomId("setup_events")
            .setLabel("Events")
            .setEmoji("🎪")
            .setStyle(ButtonStyle.Secondary),

          new ButtonBuilder()
            .setCustomId("setup_moderation")
            .setLabel("Moderation")
            .setEmoji("🛡️")
            .setStyle(ButtonStyle.Secondary)

        );

        const row3 = new ActionRowBuilder().addComponents(

          new ButtonBuilder()
            .setCustomId("setup_levels")
            .setLabel("Levels")
            .setEmoji("📊")
            .setStyle(ButtonStyle.Secondary),

          new ButtonBuilder()
            .setCustomId("setup_verification")
            .setLabel("Verification")
            .setEmoji("🔐")
            .setStyle(ButtonStyle.Secondary),

          new ButtonBuilder()
            .setCustomId("setup_logs")
            .setLabel("Logs")
            .setEmoji("📝")
            .setStyle(ButtonStyle.Secondary)

        );

        return interaction.reply({
          embeds: [embed],
          components: [row1, row2, row3],
          ephemeral: true
        });

      }

      /* BALANCE */

      if (interaction.commandName === "balance") {

        const user = getUser(
          interaction.guild.id,
          interaction.user.id
        );

        return interaction.reply({
          embeds: [
            lunaEmbed(
              "Your Balance 💰",
              `You currently have **${user.coins.toLocaleString()} coins**.`
            )
          ],
          ephemeral: true
        });

      }

      /* DAILY */

      if (interaction.commandName === "daily") {

        const user = getUser(
          interaction.guild.id,
          interaction.user.id
        );

        const now = Date.now();
        const day = 24 * 60 * 60 * 1000;

        if (now - user.lastDaily < day) {

          const remaining =
            day - (now - user.lastDaily);

          const hours =
            Math.ceil(remaining / 3600000);

          return interaction.reply({
            embeds: [
              errorEmbed(
                `You've already claimed your daily reward. Try again in approximately **${hours} hours**.`
              )
            ],
            ephemeral: true
          });

        }

        const reward = config.economyDaily || 500;

        user.coins += reward;
        user.lastDaily = now;

        save();

        return interaction.reply({
          embeds: [
            lunaEmbed(
              "Daily Reward 🎀",
              `You received **${reward.toLocaleString()} coins**!\n\nCome back tomorrow for another reward. ✨`
            )
          ]
        });

      }

      /* PAY */

      if (interaction.commandName === "pay") {

        const target =
          interaction.options.getUser("user");

        const amount =
          interaction.options.getInteger("amount");

        if (target.bot) {
          return interaction.reply({
            embeds: [
              errorEmbed("You cannot pay a bot.")
            ],
            ephemeral: true
          });
        }

        if (target.id === interaction.user.id) {
          return interaction.reply({
            embeds: [
              errorEmbed("You cannot pay yourself.")
            ],
            ephemeral: true
          });
        }

        const sender = getUser(
          interaction.guild.id,
          interaction.user.id
        );

        const receiver = getUser(
          interaction.guild.id,
          target.id
        );

        if (sender.coins < amount) {
          return interaction.reply({
            embeds: [
              errorEmbed("You don't have enough coins.")
            ],
            ephemeral: true
          });
        }

        sender.coins -= amount;
        receiver.coins += amount;

        save();

        return interaction.reply({
          embeds: [
            lunaEmbed(
              "Payment Complete 💰",
              `${interaction.user} sent **${amount.toLocaleString()} coins** to ${target}.`
            )
          ]
        });

      }

      /* RANK */

      if (interaction.commandName === "rank") {

        const user = getUser(
          interaction.guild.id,
          interaction.user.id
        );

        return interaction.reply({
          embeds: [
            lunaEmbed(
              "Your Rank 📊",
              `**${interaction.user.username}**\n\nLevel: **${user.level}**\nXP: **${user.xp}/${user.level * 100}**`
            )
          ]
        });

      }

      /* WARN */

      if (interaction.commandName === "warn") {

        const target =
          interaction.options.getMember("user");

        const reason =
          interaction.options.getString("reason") ||
          "No reason provided.";

        if (!target) {
          return interaction.reply({
            embeds: [errorEmbed("Member not found.")],
            ephemeral: true
          });
        }

        const embed = lunaEmbed(
          "Member Warned 🛡️",
          `${target} has been warned.\n\n**Reason:** ${reason}`
        );

        await interaction.reply({
          embeds: [embed]
        });

        if (config.logChannel) {

          const log =
            interaction.guild.channels.cache.get(
              config.logChannel
            );

          if (log) {
            log.send({
              embeds: [
                lunaEmbed(
                  "Moderation Log",
                  `**Action:** Warn\n**User:** ${target.user.tag}\n**Moderator:** ${interaction.user.tag}\n**Reason:** ${reason}`
                )
              ]
            });
          }

        }

        return;

      }

      /* CLEAR */

      if (interaction.commandName === "clear") {

        const amount =
          interaction.options.getInteger("amount");

        await interaction.channel.bulkDelete(
          amount,
          true
        );

        return interaction.reply({
          content: `🧹 Deleted **${amount} messages**.`,
          ephemeral: true
        });

      }

      /* LOCK */

      if (interaction.commandName === "lock") {

        await interaction.channel.permissionOverwrites.edit(
          interaction.guild.roles.everyone,
          {
            SendMessages: false
          }
        );

        return interaction.reply({
          embeds: [
            lunaEmbed(
              "Channel Locked 🔒",
              "This channel has been locked."
            )
          ]
        });

      }

      /* UNLOCK */

      if (interaction.commandName === "unlock") {

        await interaction.channel.permissionOverwrites.edit(
          interaction.guild.roles.everyone,
          {
            SendMessages: null
          }
        );

        return interaction.reply({
          embeds: [
            lunaEmbed(
              "Channel Unlocked 🔓",
              "This channel is now unlocked."
            )
          ]
        });

      }

      /* GIVEAWAY */

      if (interaction.commandName === "giveaway") {

        const prize =
          interaction.options.getString("prize");

        const minutes =
          interaction.options.getInteger("minutes");

        const winners =
          interaction.options.getInteger("winners");

        const endTime =
          Date.now() + minutes * 60 * 1000;

        const giveawayId =
          `${interaction.guild.id}_${Date.now()}`;

        const embed = lunaEmbed(
          "Giveaway 🎉",
          `## ${prize}\n\nReact with 🎉 to enter!\n\n**Winners:** ${winners}\n**Ends:** <t:${Math.floor(endTime / 1000)}:R>`
        );

        const message =
          await interaction.channel.send({
            embeds: [embed]
          });

        await message.react("🎉");

        data.giveaways[giveawayId] = {
          guildId: interaction.guild.id,
          channelId: interaction.channel.id,
          messageId: message.id,
          prize,
          winners,
          endTime
        };

        save();

        await interaction.reply({
          content: "🎉 Giveaway created!",
          ephemeral: true
        });

        setTimeout(
          () => finishGiveaway(giveawayId),
          minutes * 60 * 1000
        );

        return;

      }

      /* EVENT */

      if (interaction.commandName === "event") {

        const name =
          interaction.options.getString("name");

        const description =
          interaction.options.getString("description");

        const date =
          interaction.options.getString("date");

        const embed = lunaEmbed(
          `Event: ${name} 🎪`,
          `${description}\n\n📅 **Date:** ${date}\n\nClick below to RSVP!`
        );

        const row =
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`event_${Date.now()}`)
              .setLabel("RSVP")
              .setEmoji("🎟️")
              .setStyle(ButtonStyle.Primary)
          );

        return interaction.reply({
          embeds: [embed],
          components: [row]
        });

      }

    }

    /* ================= BUTTONS ================= */

    if (interaction.isButton()) {

      /* SETUP WELCOME */

      if (interaction.customId === "setup_welcome") {

        const embed = lunaEmbed(
          "Welcome Setup 👋",
          "Choose what you want to configure."
        );

        const row =
          new ActionRowBuilder().addComponents(

            new ButtonBuilder()
              .setCustomId("welcome_enable")
              .setLabel("Enable")
              .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
              .setCustomId("welcome_disable")
              .setLabel("Disable")
              .setStyle(ButtonStyle.Danger),

            new ButtonBuilder()
              .setCustomId("welcome_channel")
              .setLabel("Set Channel")
              .setStyle(ButtonStyle.Primary)

          );

        return interaction.reply({
          embeds: [embed],
          components: [row],
          ephemeral: true
        });

      }

      /* WELCOME ENABLE */

      if (interaction.customId === "welcome_enable") {

        const config =
          getGuild(interaction.guild.id);

        config.welcomeEnabled = true;

        save();

        return interaction.reply({
          embeds: [
            lunaEmbed(
              "Welcome Enabled 👋",
              "Welcome messages are now enabled.\n\nUse **Set Channel** to choose where they should appear."
            )
          ],
          ephemeral: true
        });

      }

      /* WELCOME DISABLE */

      if (interaction.customId === "welcome_disable") {

        const config =
          getGuild(interaction.guild.id);

        config.welcomeEnabled = false;

        save();

        return interaction.reply({
          embeds: [
            lunaEmbed(
              "Welcome Disabled",
              "Welcome messages have been disabled."
            )
          ],
          ephemeral: true
        });

      }

      /* WELCOME CHANNEL */

      if (interaction.customId === "welcome_channel") {

        const modal = new ModalBuilder()
          .setCustomId("welcome_channel_modal")
          .setTitle("Welcome Channel");

        const input = new TextInputBuilder()
          .setCustomId("channel_id")
          .setLabel("Channel ID")
          .setPlaceholder("123456789012345678")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(input)
        );

        return interaction.showModal(modal);

      }

      /* TICKETS */

      if (interaction.customId === "setup_tickets") {

        const embed = lunaEmbed(
          "Ticket Setup 🎫",
          "Create your ticket panel with one click."
        );

        const row =
          new ActionRowBuilder().addComponents(

            new ButtonBuilder()
              .setCustomId("create_ticket_panel")
              .setLabel("Create Ticket Panel")
              .setEmoji("🎫")
              .setStyle(ButtonStyle.Primary)

          );

        return interaction.reply({
          embeds: [embed],
          components: [row],
          ephemeral: true
        });

      }

      /* CREATE TICKET PANEL */

      if (interaction.customId === "create_ticket_panel") {

        const embed = lunaEmbed(
          "Support Center 🎫",
          "Need help? Choose a ticket type below.\n\nOur team will assist you as soon as possible."
        );

        const row =
          new ActionRowBuilder().addComponents(

            new ButtonBuilder()
              .setCustomId("ticket_support")
              .setLabel("Support")
              .setEmoji("💬")
              .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
              .setCustomId("ticket_report")
              .setLabel("Report")
              .setEmoji("🚨")
              .setStyle(ButtonStyle.Danger),

            new ButtonBuilder()
              .setCustomId("ticket_partner")
              .setLabel("Partnership")
              .setEmoji("🤝")
              .setStyle(ButtonStyle.Secondary)

          );

        await interaction.channel.send({
          embeds: [embed],
          components: [row]
        });

        return interaction.reply({
          content: "🎫 Ticket panel created!",
          ephemeral: true
        });

      }

      /* TICKET CREATE */

      if (
        interaction.customId === "ticket_support" ||
        interaction.customId === "ticket_report" ||
        interaction.customId === "ticket_partner"
      ) {

        const type =
          interaction.customId === "ticket_support"
            ? "support"
            : interaction.customId === "ticket_report"
              ? "report"
              : "partnership";

        const channelName =
          `ticket-${interaction.user.username}`
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "");

        const existing =
          interaction.guild.channels.cache.find(
            channel =>
              channel.name === channelName
          );

        if (existing) {

          return interaction.reply({
            content: `🎫 You already have a ticket: ${existing}`,
            ephemeral: true
          });

        }

        const channel =
          await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            permissionOverwrites: [
              {
                id: interaction.guild.roles.everyone.id,
                deny: [PermissionFlagsBits.ViewChannel]
              },
              {
                id: interaction.user.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory
                ]
              }
            ]
          });

        const embed = lunaEmbed(
          "Ticket Created 🎫",
          `Welcome ${interaction.user}!\n\n**Type:** ${type}\n\nPlease explain your request clearly. A member of the team will help you soon.`
        );

        const row =
          new ActionRowBuilder().addComponents(

            new ButtonBuilder()
              .setCustomId("ticket_close")
              .setLabel("Close Ticket")
              .setEmoji("🔒")
              .setStyle(ButtonStyle.Danger)

          );

        await channel.send({
          content: `${interaction.user}`,
          embeds: [embed],
          components: [row]
        });

        return interaction.reply({
          content: `🎫 Your ticket has been created: ${channel}`,
          ephemeral: true
        });

      }

      /* CLOSE TICKET */

      if (interaction.customId === "ticket_close") {

        await interaction.reply({
          embeds: [
            lunaEmbed(
              "Ticket Closing 🔒",
              "This ticket will be deleted in 5 seconds."
            )
          ]
        });

        setTimeout(() => {
          interaction.channel.delete().catch(() => {});
        }, 5000);

        return;

      }

      /* ECONOMY SETUP */

      if (interaction.customId === "setup_economy") {

        const config =
          getGuild(interaction.guild.id);

        config.economyEnabled = true;

        save();

        return interaction.reply({
          embeds: [
            lunaEmbed(
              "Economy Enabled 💰",
              "The Luna economy is now enabled!\n\nMembers can use `/balance`, `/daily` and `/pay`."
            )
          ],
          ephemeral: true
        });

      }

      /* LEVEL SETUP */

      if (interaction.customId === "setup_levels") {

        const config =
          getGuild(interaction.guild.id);

        config.levelEnabled = !config.levelEnabled;

        save();

        return interaction.reply({
          embeds: [
            lunaEmbed(
              "Levels 📊",
              `Level system is now **${config.levelEnabled ? "enabled" : "disabled"}**.`
            )
          ],
          ephemeral: true
        });

      }

      /* MODERATION */

      if (interaction.customId === "setup_moderation") {

        return interaction.reply({
          embeds: [
            lunaEmbed(
              "Moderation 🛡️",
              "Luna moderation commands are available:\n\n`/warn`\n`/clear`\n`/lock`\n`/unlock`"
            )
          ],
          ephemeral: true
        });

      }

      /* GIVEAWAYS */

      if (interaction.customId === "setup_giveaways") {

        return interaction.reply({
          embeds: [
            lunaEmbed(
              "Giveaways 🎉",
              "Use `/giveaway` to create a giveaway."
            )
          ],
          ephemeral: true
        });

      }

      /* EVENTS */

      if (interaction.customId === "setup_events") {

        return interaction.reply({
          embeds: [
            lunaEmbed(
              "Events 🎪",
              "Use `/event` to create a community event."
            )
          ],
          ephemeral: true
        });

      }

      /* VERIFICATION */

      if (interaction.customId === "setup_verification") {

        return interaction.reply({
          embeds: [
            lunaEmbed(
              "Verification 🔐",
              "Verification setup will allow you to create a verification panel and automatically give verified members a role."
            )
          ],
          ephemeral: true
        });

      }

      /* LOGS */

      if (interaction.customId === "setup_logs") {

        return interaction.reply({
          embeds: [
            lunaEmbed(
              "Logs 📝",
              "Logging configuration can be connected to a dedicated channel."
            )
          ],
          ephemeral: true
        });

      }

      /* EVENT RSVP */

      if (interaction.customId.startsWith("event_")) {

        return interaction.reply({
          embeds: [
            lunaEmbed(
              "RSVP Confirmed 🎟️",
              "You're registered for this event!"
            )
          ],
          ephemeral: true
        });

      }

    }

    /* ================= MODALS ================= */

    if (interaction.isModalSubmit()) {

      if (
        interaction.customId ===
        "welcome_channel_modal"
      ) {

        const channelId =
          interaction.fields.getTextInputValue(
            "channel_id"
          );

        const channel =
          interaction.guild.channels.cache.get(
            channelId
          );

        if (!channel) {

          return interaction.reply({
            embeds: [
              errorEmbed(
                "I couldn't find that channel. Make sure you used the correct channel ID."
              )
            ],
            ephemeral: true
          });

        }

        const config =
          getGuild(interaction.guild.id);

        config.welcomeChannel = channel.id;

        save();

        return interaction.reply({
          embeds: [
            lunaEmbed(
              "Welcome Channel Set 👋",
              `Welcome messages will now be sent in ${channel}.`
            )
          ],
          ephemeral: true
        });

      }

    }

  } catch (error) {

    console.error(error);

    if (!interaction.replied && !interaction.deferred) {

      await interaction.reply({
        embeds: [
          errorEmbed(
            "Something went wrong while processing that action."
          )
        ],
        ephemeral: true
      }).catch(() => {});

    }

  }

});

/* =========================================================
   GIVEAWAY ENGINE
========================================================= */

async function finishGiveaway(id) {

  const giveaway = data.giveaways[id];

  if (!giveaway) return;

  try {

    const guild =
      client.guilds.cache.get(
        giveaway.guildId
      );

    if (!guild) return;

    const channel =
      guild.channels.cache.get(
        giveaway.channelId
      );

    if (!channel) return;

    const message =
      await channel.messages.fetch(
        giveaway.messageId
      );

    const reaction =
      message.reactions.cache.get("🎉");

    if (!reaction) return;

    const users =
      await reaction.users.fetch();

    const participants =
      users.filter(user => !user.bot);

    const array =
      [...participants.values()];

    if (array.length === 0) {

      await channel.send({
        embeds: [
          lunaEmbed(
            "Giveaway Ended 🎉",
            `The giveaway for **${giveaway.prize}** ended, but nobody entered.`
          )
        ]
      });

      delete data.giveaways[id];
      save();

      return;
    }

    const winners = [];

    for (
      let i = 0;
      i < Math.min(
        giveaway.winners,
        array.length
      );
      i++
    ) {

      const index =
        Math.floor(
          Math.random() * array.length
        );

      winners.push(
        array.splice(index, 1)[0]
      );

    }

    await channel.send({
      content:
        `🎉 Congratulations ${winners.map(u => `<@${u.id}>`).join(", ")}!`,
      embeds: [
        lunaEmbed(
          "Giveaway Winner 🎀",
          `Prize: **${giveaway.prize}**\n\nCongratulations to the winner${winners.length > 1 ? "s" : ""}!`
        )
      ]
    });

    delete data.giveaways[id];
    save();

  } catch (error) {

    console.error(
      "Giveaway error:",
      error
    );

  }

}

/* =========================================================
   LOGIN
========================================================= */

if (!process.env.DISCORD_TOKEN) {

  console.error(
    "❌ DISCORD_TOKEN is missing."
  );

  process.exit(1);

}

client.login(
  process.env.DISCORD_TOKEN
);
