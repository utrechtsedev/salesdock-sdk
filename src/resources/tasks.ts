import { z } from "zod";
import { BaseResource } from "./base.js";
import { idSchema, loose, nullish } from "../schemas/common.js";
import { fetchCursorPage, type CursorPage } from "../core/pagination.js";
import type { QueryParams, RequestOptions } from "../core/types.js";

/** A user reference (owner / assignee) embedded in a task, with org and team. */
export const TaskUserRefSchema = loose({
  id: nullish(idSchema),
  name: nullish(z.string()),
  organisation: loose({
    id: nullish(idSchema),
    name: nullish(z.string()),
  }).optional(),
  team: loose({
    id: nullish(idSchema),
    name: nullish(z.string()),
  }).optional(),
});
export type TaskUserRef = z.infer<typeof TaskUserRefSchema>;

/** A task as returned in the cursor-paginated list response. */
export const TaskListItemSchema = loose({
  id: idSchema,
  title: nullish(z.string()),
  type: nullish(z.string()),
  status: nullish(z.string()),
  planned_date: nullish(z.string()),
  planned_time: nullish(z.string()),
  end_time: nullish(z.string()),
  assigned_user_id: nullish(idSchema),
  owner_user_id: nullish(idSchema),
  assigned_to: TaskUserRefSchema.optional(),
  owner: TaskUserRefSchema.optional(),
  description: nullish(z.string()),
  remarks: nullish(z.string()),
  location: nullish(z.string()),
  lead_id: nullish(idSchema),
  relation_id: nullish(idSchema),
  completed_at: nullish(z.string()),
  created_at: nullish(z.string()),
  updated_at: nullish(z.string()),
});
export type TaskListItem = z.infer<typeof TaskListItemSchema>;

/** A single task with its full detail (includes resolved user name strings). */
export const TaskSchema = loose({
  id: idSchema,
  title: nullish(z.string()),
  type: nullish(z.string()),
  status: nullish(z.string()),
  description: nullish(z.string()),
  remarks: nullish(z.string()),
  location: nullish(z.string()),
  planned_date: nullish(z.string()),
  planned_time: nullish(z.string()),
  end_time: nullish(z.string()),
  assigned_user_id: nullish(idSchema),
  assigned_user: nullish(z.string()),
  owner_user_id: nullish(idSchema),
  owner_user: nullish(z.string()),
  assigned_to: TaskUserRefSchema.optional(),
  owner: TaskUserRefSchema.optional(),
  lead_id: nullish(idSchema),
  relation_id: nullish(idSchema),
  completed_at: nullish(z.string()),
  created_at: nullish(z.string()),
  updated_at: nullish(z.string()),
});
export type Task = z.infer<typeof TaskSchema>;

/** Result returned by create/update/delete: the affected task's id. */
export const MutateTaskResultSchema = loose({ task_id: idSchema });
export type MutateTaskResult = z.infer<typeof MutateTaskResultSchema>;

/** Query parameters for {@link TasksClient.list}. */
export interface ListTasksParams {
  /** `open` = all open tasks, `completed` = all completed tasks. Empty for all. */
  mode?: "open" | "completed";
  /** `yes`/`no`. When `yes`, the date filter uses the completed date. */
  completed?: "yes" | "no";
  /** The user id of the owner of the task. */
  owner_user_id?: number | string;
  /** The user id of the assigned user of the task. */
  assigned_user_id?: number | string;
  /** Period preset: `custom`, `today`, `yesterday`, `this_week`, `last_week`, `last_30_days`, `this_month`, `last_month`, `this_year`. */
  period?: string;
  /** Start date when `period` is `custom`. */
  period_start?: string;
  /** End date when `period` is `custom`. */
  period_end?: string;
}

/** Body for creating/updating a task. `title` and `type` are required. */
export const TaskInputSchema = z
  .object({
    /** The title of the task (required). */
    title: z.string(),
    /** Task type: `default`, `appointment`, or `callback` (required). */
    type: z.string(),
    /** Description of the task. */
    description: z.string().optional(),
    /** Remarks (if any) for the task. */
    remarks: z.string().optional(),
    /** The location where the task is planned to take place. */
    location: z.string().optional(),
    /** The planned date of the task in `dd-mm-yyyy` format. */
    planned_date: z.string().optional(),
    /** The planned start time of the task in `hh:mm` format. */
    planned_start_time: z.string().optional(),
    /** The planned end time of the task in `hh:mm` format. */
    planned_end_time: z.string().optional(),
    /** The ID of the user to assign the task to. */
    user_id: idSchema.optional(),
    /** The ID of the relation to attach the task to. */
    relation_id: idSchema.optional(),
    /** Whether the task is completed: `yes` or `no`. */
    completed: z.union([z.literal("yes"), z.literal("no")]).optional(),
  })
  .passthrough();
export type TaskInput = z.input<typeof TaskInputSchema>;

/**
 * Tasks API — manage tasks (default tasks, appointments and callbacks).
 * List/get/create/update honor the configured scope (`account`/`user`);
 * delete is always `account` scope (admin only).
 */
export class TasksClient extends BaseResource {
  /** List tasks (cursor-paginated). Honors the configured scope. */
  list(params: ListTasksParams = {}, options?: RequestOptions): Promise<CursorPage<TaskListItem>> {
    return fetchCursorPage(
      this.http,
      TaskListItemSchema,
      [this.scope(options), "tasks"],
      params as QueryParams,
      options,
    );
  }

  /** Retrieve a single task by id. Honors the configured scope. */
  get(taskId: number | string, options?: RequestOptions): Promise<Task> {
    return this.http.request({
      method: "GET",
      segments: [this.scope(options), "tasks", taskId],
      dataSchema: TaskSchema,
      options,
    });
  }

  /** Create a task. Honors the configured scope. */
  create(input: TaskInput, options?: RequestOptions): Promise<MutateTaskResult> {
    const body = this.parseInput(TaskInputSchema, input, "tasks.create");
    return this.http.request({
      method: "POST",
      segments: [this.scope(options), "tasks"],
      dataSchema: MutateTaskResultSchema,
      body,
      options,
    });
  }

  /** Update a task by id. Honors the configured scope. */
  update(
    taskId: number | string,
    input: TaskInput,
    options?: RequestOptions,
  ): Promise<MutateTaskResult> {
    const body = this.parseInput(TaskInputSchema, input, "tasks.update");
    return this.http.request({
      method: "PUT",
      segments: [this.scope(options), "tasks", taskId],
      dataSchema: MutateTaskResultSchema,
      body,
      options,
    });
  }

  /** Delete a task by id (always `account` scope, admin only). */
  delete(taskId: number | string, options?: RequestOptions): Promise<MutateTaskResult> {
    return this.http.request({
      method: "DELETE",
      segments: ["account", "tasks", taskId],
      dataSchema: MutateTaskResultSchema,
      options,
    });
  }
}
