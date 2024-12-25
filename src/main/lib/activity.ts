//import Store from 'electron-store';
import { ActivityLogs, PrismaClient } from '@prisma/client';
import _ from 'underscore';
import Store from 'electron-store';
import DatabaseClient from './database-client';

interface Event {
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  url: string;
  time: number;
}

interface Breakdown {
  title: string;
  time: number;
  subActivity: SubActivity[];
}

interface SubActivity {
  title: string;
  time: number;
}

class ActivityManager {

  private prisma: PrismaClient;
  private store: Store;
  private labId: string;
  private userId: string;
  private deviceId: string;

  constructor() {
    this.store = new Store();
    this.prisma = DatabaseClient.prisma;
    this.labId = this.store.get('labId') as string;
    this.userId = this.store.get('userId') as string;
    this.deviceId = this.store.get('deviceId') as string;
  }

  async save(activity: Omit<ActivityLogs, 'id' | 'time' | 'userId' | 'deviceId' | 'labId' | 'createdAt' | 'updatedAt'>): Promise<boolean> {
    const lastActivity = await this.getLastActivity();
    if (!lastActivity || lastActivity.title !== activity.title || this.diffMinutes(new Date(lastActivity.time), new Date()) >= 1) {
      const newActivity = await this.prisma.activityLogs.create({
        data: {
          ...activity,
          time: new Date(),
          labId: this.labId,
          userId: this.userId,
          deviceId: this.deviceId,
        }
      });
      return !!newActivity;
    }
    return false;
  }

  async getLastActivity(): Promise<ActivityLogs | undefined> {
    return _.last(await this.prisma.activityLogs.findMany({
      where: {
        labId: this.labId,
        userId: this.userId,
        deviceId: this.deviceId,
      }
    }));
  }

  async all(): Promise<ActivityLogs[]> {
    return this.prisma.activityLogs.findMany({
      where: {
        labId: this.labId,
        userId: this.userId,
        deviceId: this.deviceId,
      },
    });
  }

  async byDay(day: string): Promise<ActivityLogs[]> {
    const activities = await this.prisma.activityLogs.findMany({
      where: {
        labId: this.labId,
        userId: this.userId,
        deviceId: this.deviceId,
      },
    });
    return activities.filter(activity =>
      new Date(activity.time).toISOString().slice(0, 10) === day
    );
  }

  async getEvents(): Promise<Event[]> {
    const activities = await this.all();
    const events: Event[] = [];

    for (let i = 0; i < activities.length; i++) {
      if (activities[i + 1]) {
        const thisDate = new Date(activities[i].time).toISOString().slice(0, 10);
        const nextDate = new Date(activities[i + 1].time).toISOString().slice(0, 10);
        const found = events.find(({ start }) => start === thisDate);

        const nextTime = thisDate === nextDate
          ? new Date(activities[i + 1].time)
          : new Date(`${thisDate}T23:59:59`);

        const time = this.diffMinutes(new Date(activities[i].time), nextTime);
        const hours = Math.floor(time / 60);
        const minutes = time % 60;

        if (found) {
          found.time += time;
          found.title = `${Math.floor(found.time / 60)} Hrs ${found.time % 60} Min recorded`;
        } else {
          events.push({
            title: `${hours} Hrs ${minutes} Min recorded`,
            start: thisDate,
            end: thisDate,
            allDay: true,
            url: `day.html?date=${thisDate}`,
            time: time
          });
        }
      }
    }
    return events;
  }

  formatActivities(activities: ActivityLogs[]): Breakdown[] {
    const breakdown: Breakdown[] = [];

    for (let i = 0; i < activities.length; i++) {
      const currentActivity = activities[i];
      const nextActivity = activities[i + 1];
      const time = nextActivity
        ? this.diffMinutes(new Date(currentActivity.time), new Date(nextActivity.time))
        : this.diffMinutes(new Date(currentActivity.time), new Date());

      const found = breakdown.find(({ title }) => title === currentActivity.owner);

      if (found) {
        found.time += time;
        const subActivityFound = found.subActivity.find(({ title }) => title === currentActivity.title);

        if (subActivityFound) {
          subActivityFound.time += time;
        } else {
          found.subActivity.push({ title: currentActivity.title, time: time });
        }
      } else {
        breakdown.push({
          title: currentActivity.owner,
          time: time,
          subActivity: [{ title: currentActivity.title, time: time }]
        });
      }
    }

    breakdown.forEach(item => {
      item.subActivity = _.sortBy(item.subActivity, 'time').reverse();
    });

    return _.sortBy(breakdown, 'time').reverse();
  }

  private diffMinutes(dt2: Date, dt1: Date): number {
    const diff = (dt2.getTime() - dt1.getTime()) / 1000;
    return Math.abs(Math.round(diff / 60));
  }

}

export { ActivityManager, Event, Breakdown, SubActivity };