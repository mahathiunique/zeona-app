import { where, orderBy } from 'firebase/firestore';
import { DbService } from '../db';
import { ITaskRepository } from './interfaces';
import { Task } from '../../../types/models';

export const TaskRepository: ITaskRepository = {
  /**
   * Fetch a single task by ID.
   */
  async getTask(userId: string, taskId: string): Promise<Task | null> {
    try {
      return await DbService.getUserDocument<Task>(userId, 'tasks', taskId);
    } catch (error) {
      throw new Error(`TaskRepository.getTask failed: ${(error as Error).message}`);
    }
  },

  /**
   * Save a task (create or overwrite).
   */
  async saveTask(task: Task): Promise<void> {
    try {
      await DbService.saveUserDocument<Task>(task.userId, 'tasks', task.id, task);
    } catch (error) {
      throw new Error(`TaskRepository.saveTask failed: ${(error as Error).message}`);
    }
  },

  /**
   * Delete a task.
   */
  async deleteTask(userId: string, taskId: string): Promise<void> {
    try {
      await DbService.deleteUserDocument(userId, 'tasks', taskId);
    } catch (error) {
      throw new Error(`TaskRepository.deleteTask failed: ${(error as Error).message}`);
    }
  },

  /**
   * Get all tasks due on a specific date.
   */
  async getTasksForDate(userId: string, date: string): Promise<Task[]> {
    try {
      const constraints = [
        where('dueDate', '==', date),
        orderBy('createdAt', 'asc'),
      ];
      return await DbService.queryUserDocuments<Task>(userId, 'tasks', constraints);
    } catch (error) {
      throw new Error(`TaskRepository.getTasksForDate failed: ${(error as Error).message}`);
    }
  },

  /**
   * Get all tasks due in a specific date range.
   */
  async getTasksForRange(userId: string, startDate: string, endDate: string): Promise<Task[]> {
    try {
      const constraints = [
        where('dueDate', '>=', startDate),
        where('dueDate', '<=', endDate),
        orderBy('dueDate', 'asc'),
      ];
      return await DbService.queryUserDocuments<Task>(userId, 'tasks', constraints);
    } catch (error) {
      throw new Error(`TaskRepository.getTasksForRange failed: ${(error as Error).message}`);
    }
  },
};

export default TaskRepository;
