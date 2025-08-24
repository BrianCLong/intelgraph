/**
 * Goal Service - Stub implementation
 * Provides basic goal management functionality for copilot integration
 */
// In-memory goal store (replace with database later)
const goals = new Map();
let idCounter = 1;
class GoalService {
    /**
     * Create a new goal
     * @param {Object} goalData Goal data
     * @returns {Object} Created goal
     */
    static createGoal(goalData) {
        const goal = {
            id: String(idCounter++),
            text: goalData.text,
            investigationId: goalData.investigationId,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        goals.set(goal.id, goal);
        return goal;
    }
    /**
     * Get goal by ID
     * @param {string} id Goal ID
     * @returns {Object|null} Goal or null if not found
     */
    static getGoalById(id) {
        return goals.get(id) || null;
    }
    /**
     * Get all goals
     * @param {string} investigationId Optional investigation ID filter
     * @returns {Array} Array of goals
     */
    static getAllGoals(investigationId = null) {
        const allGoals = Array.from(goals.values());
        if (investigationId) {
            return allGoals.filter(goal => goal.investigationId === investigationId);
        }
        return allGoals;
    }
    /**
     * Update goal
     * @param {string} id Goal ID
     * @param {Object} updateData Update data
     * @returns {Object|null} Updated goal or null if not found
     */
    static updateGoal(id, updateData) {
        const goal = goals.get(id);
        if (!goal)
            return null;
        const updatedGoal = {
            ...goal,
            ...updateData,
            updatedAt: new Date().toISOString()
        };
        goals.set(id, updatedGoal);
        return updatedGoal;
    }
    /**
     * Delete goal
     * @param {string} id Goal ID
     * @returns {boolean} True if deleted, false if not found
     */
    static deleteGoal(id) {
        return goals.delete(id);
    }
    /**
     * Clear all goals (for testing)
     */
    static clearAll() {
        goals.clear();
        idCounter = 1;
    }
}
// Export both the class and individual functions for compatibility
module.exports = GoalService;
// Named exports for backward compatibility
module.exports.getGoalById = GoalService.getGoalById.bind(GoalService);
module.exports.createGoal = GoalService.createGoal.bind(GoalService);
module.exports.getAllGoals = GoalService.getAllGoals.bind(GoalService);
module.exports.updateGoal = GoalService.updateGoal.bind(GoalService);
module.exports.deleteGoal = GoalService.deleteGoal.bind(GoalService);
//# sourceMappingURL=goalService.js.map