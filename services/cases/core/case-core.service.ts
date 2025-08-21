export type Task = {
  id: string;
  title: string;
  assignee?: string;
  dueAt?: Date;
};

export type RoleAssignment = {
  userId: string;
  role: string;
};

export class CaseCoreService {
  tasks: Task[] = [];
  roles: RoleAssignment[] = [];
  watchlist: string[] = [];

  createTask(task: Task) {
    this.tasks.push(task);
    return task;
  }

  assignRole(userId: string, role: string) {
    const assignment = { userId, role };
    this.roles.push(assignment);
    return assignment;
  }

  addToWatchlist(itemId: string) {
    this.watchlist.push(itemId);
  }

  startSlaTimer(taskId: string, durationMs: number) {
    // Placeholder: integrate with timer service
    return { taskId, expiresAt: new Date(Date.now() + durationMs) };
  }

  requireFourEyes(action: () => void) {
    // Placeholder: enforce four-eyes principle before executing
    action();
  }
}
