const cron = require("node-cron");
const ScheduleDB = require("../lib/database/schedule");
const { alpha, isAdmin, config, errorHandler } = require("../lib");

const jobFunctions = {
  muteGroup: async (message, jid) => {
    try {
      console.log(`Muting group ${jid}`);
      await message.client.groupSettingUpdate(jid, "announcement");
    } catch (error) {
      throw error;
    }
  },
  unmuteGroup: async (message, jid) => {
    try {
      console.log(`Unmuting group ${jid}`);
      await message.client.groupSettingUpdate(jid, "not_announcement");
    } catch (error) {
      throw error; 
    }
  },
};

const scheduleModule = {
  scheduleCron: async (timeString, jobFunction) => {
    try {
      let [hours, minutes] = timeString.split(":");
      let cronJob = cron.schedule(`${minutes} ${hours} * * *`, jobFunction, {
        scheduled: false,
        timezone: config.TZ,
      });
      cronJob.start();
      console.log(`Scheduled job for ${timeString}`);
      return cronJob;
    } catch (error) {
      throw error; 
    }
  },

  saveSchedule: async (chatId, timeString, jobFunctionName) => {
    try {
      await ScheduleDB.create({
        chatId,
        time: timeString,
        jobFunction: jobFunctionName,
      });
      console.log(`Saved schedule for chatId: ${chatId}, time: ${timeString}`);
    } catch (error) {
      throw error; 
    }
  },

  getSchedule: async (chatId) => {
    try {
      return await ScheduleDB.findAll({
        where: { chatId },
      });
    } catch (error) {
      throw error; 
    }
  },

  startSchedule: async (message, chatId = "all") => {
    try {
      const schedulesToStart =
        chatId === "all"
          ? await ScheduleDB.findAll()
          : await ScheduleDB.findAll({ where: { chatId } });

      for (let schedule of schedulesToStart) {
        const jobFunction = jobFunctions[schedule.jobFunction];
        if (jobFunction) {
          await scheduleModule.scheduleCron(schedule.time, async () =>
            jobFunction(message, schedule.chatId),
          );
        }
      }
      console.log(`Started schedules for chatId: ${chatId}`);
    } catch (error) {
      throw error; 
    }
  },
};

alpha(
  {
    pattern: "amute",
    fromMe: true,
    desc: "auto mute group at a specific time",
    type: "group",
  },
  async (message, match, m, client) => {
    try {
      if (!message.isGroup)
        return await message.reply("_This command is for groups_");
      if (!(await isAdmin(message.jid, message.user, message.client)))
        return await message.reply("_I'm not admin_");
      let time = match;
      if (!time)
        return await message.reply("_Please specify a time in HH:MM format_");
      await scheduleModule.saveSchedule(message.jid, time, "muteGroup");
      await scheduleModule.startSchedule(message, message.jid);
      return await message.reply(`_Scheduled to mute the group at ${time}_`);
    } catch (error) {
      errorHandler(message, error);
    }
  }
);

alpha(
  {
    pattern: "aunmute",
    fromMe: true,
    desc: "auto unmute group at a specific time",
    type: "group",
  },
  async (message, match, m, client) => {
    try {
      if (!message.isGroup)
        return await message.reply("_This command is for groups_");
      if (!(await isAdmin(message.jid, message.user, message.client)))
        return await message.reply("_I'm not admin_");
      let time = match;
      if (!time)
        return await message.reply("_Please specify a time in HH:MM format_");
      await scheduleModule.saveSchedule(message.jid, time, "unmuteGroup");
      await scheduleModule.startSchedule(message, message.jid);
      return await message.reply(`_Scheduled to unmute the group at ${time}_`);
    } catch (error) {
      errorHandler(message, error);
    }
  }
);
