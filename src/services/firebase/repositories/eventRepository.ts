import { where, orderBy } from 'firebase/firestore';
import { DbService } from '../db';
import { IEventRepository } from './interfaces';
import { Event, SpecialDate } from '../../../types/models';

export const EventRepository: IEventRepository = {
  /**
   * Fetch events falling within a specific date range.
   */
  async getEventsForRange(userId: string, startDate: string, endDate: string): Promise<Event[]> {
    try {
      const constraints = [
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'asc'),
      ];
      return await DbService.queryUserDocuments<Event>(userId, 'events', constraints);
    } catch (error) {
      throw new Error(`EventRepository.getEventsForRange failed: ${(error as Error).message}`);
    }
  },

  /**
   * Save an event check-in (create or overwrite).
   */
  async saveEvent(event: Event): Promise<void> {
    try {
      await DbService.saveUserDocument<Event>(event.userId, 'events', event.id, event);
    } catch (error) {
      throw new Error(`EventRepository.saveEvent failed: ${(error as Error).message}`);
    }
  },

  /**
   * Delete an event.
   */
  async deleteEvent(userId: string, eventId: string): Promise<void> {
    try {
      await DbService.deleteUserDocument(userId, 'events', eventId);
    } catch (error) {
      throw new Error(`EventRepository.deleteEvent failed: ${(error as Error).message}`);
    }
  },

  /**
   * Get all special dates for a user.
   */
  async getSpecialDates(userId: string): Promise<SpecialDate[]> {
    try {
      const constraints = [orderBy('date', 'asc')];
      return await DbService.queryUserDocuments<SpecialDate>(userId, 'specialDates', constraints);
    } catch (error) {
      throw new Error(`EventRepository.getSpecialDates failed: ${(error as Error).message}`);
    }
  },

  /**
   * Save a special date definition (create or overwrite).
   */
  async saveSpecialDate(date: SpecialDate): Promise<void> {
    try {
      await DbService.saveUserDocument<SpecialDate>(date.userId, 'specialDates', date.id, date);
    } catch (error) {
      throw new Error(`EventRepository.saveSpecialDate failed: ${(error as Error).message}`);
    }
  },

  /**
   * Delete a special date.
   */
  async deleteSpecialDate(userId: string, dateId: string): Promise<void> {
    try {
      await DbService.deleteUserDocument(userId, 'specialDates', dateId);
    } catch (error) {
      throw new Error(`EventRepository.deleteSpecialDate failed: ${(error as Error).message}`);
    }
  },
};

export default EventRepository;
