import { where, orderBy } from 'firebase/firestore';
import { DbService } from '../db';
import { IGoalRepository } from './interfaces';
import { Goal, GoalMilestone } from '../../../types/models';

export const GoalRepository: IGoalRepository = {
  /**
   * Fetch a single goal by ID.
   */
  async getGoal(userId: string, goalId: string): Promise<Goal | null> {
    try {
      return await DbService.getUserDocument<Goal>(userId, 'goals', goalId);
    } catch (error) {
      throw new Error(`GoalRepository.getGoal failed: ${(error as Error).message}`);
    }
  },

  /**
   * Save a goal (create or overwrite).
   */
  async saveGoal(goal: Goal): Promise<void> {
    try {
      await DbService.saveUserDocument<Goal>(goal.userId, 'goals', goal.id, goal);
    } catch (error) {
      throw new Error(`GoalRepository.saveGoal failed: ${(error as Error).message}`);
    }
  },

  /**
   * Delete a goal.
   */
  async deleteGoal(userId: string, goalId: string): Promise<void> {
    try {
      await DbService.deleteUserDocument(userId, 'goals', goalId);
    } catch (error) {
      throw new Error(`GoalRepository.deleteGoal failed: ${(error as Error).message}`);
    }
  },

  /**
   * Fetch all goals for a user.
   */
  async getGoals(userId: string): Promise<Goal[]> {
    try {
      const constraints = [orderBy('createdAt', 'desc')];
      return await DbService.queryUserDocuments<Goal>(userId, 'goals', constraints);
    } catch (error) {
      throw new Error(`GoalRepository.getGoals failed: ${(error as Error).message}`);
    }
  },

  /**
   * Fetch all milestones associated with a specific goal.
   * Milestones are stored under users/{userId}/goalMilestones and filtered by goalId.
   */
  async getMilestones(userId: string, goalId: string): Promise<GoalMilestone[]> {
    try {
      const constraints = [
        where('goalId', '==', goalId),
        orderBy('createdAt', 'asc'),
      ];
      return await DbService.queryUserDocuments<GoalMilestone>(userId, 'goalMilestones', constraints);
    } catch (error) {
      throw new Error(`GoalRepository.getMilestones failed: ${(error as Error).message}`);
    }
  },

  /**
   * Save a milestone definition.
   */
  async saveMilestone(milestone: GoalMilestone): Promise<void> {
    try {
      await DbService.saveUserDocument<GoalMilestone>(
        milestone.userId,
        'goalMilestones',
        milestone.id,
        milestone
      );
    } catch (error) {
      throw new Error(`GoalRepository.saveMilestone failed: ${(error as Error).message}`);
    }
  },

  /**
   * Delete a milestone.
   */
  async deleteMilestone(userId: string, _goalId: string, milestoneId: string): Promise<void> {
    try {
      // Note: goalId is passed for checking / security integrity if needed
      await DbService.deleteUserDocument(userId, 'goalMilestones', milestoneId);
    } catch (error) {
      throw new Error(`GoalRepository.deleteMilestone failed: ${(error as Error).message}`);
    }
  },
};

export default GoalRepository;
