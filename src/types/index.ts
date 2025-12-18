/**
 * Shared types for the application
 */

import { FILTER_MODES } from "@/lib/constants";
import { MongoQuery, PureAbility } from '@casl/ability';
import { PrismaQuery, Subjects } from '@casl/prisma';

export type FilterColumnsValue<T> = {
  mode: FILTER_MODES;
  value?: T;
};

// === Enums ===
export enum Action {
  Read = 'read',
  Create = 'create',
  Update = 'update',
  Delete = 'delete',
  Manage = 'manage',
  Assign = 'assign',
  Archive = 'archive',
}

export enum Subject {User = 'User',
  Settings = 'Settings',
  Task = 'Task',
  Project = 'Project',
  Milestone = 'Milestone',
  Comment = 'Comment',
  File = 'File',
  Label = 'Label',
  Commit = 'Commit',
  Customer = 'Customer',
  All = 'all',
}

type ValuesOf<T> = T[keyof T];

export type PrismaWhereInput = ValuesOf<PrismaQuery>;

export type ActionType = Action | string;
export type SubjectType = Subject | string;

export type AppAbility = PureAbility<[ActionType, SubjectType], MongoQuery>;
export type PrismaSubjects = Subjects<{ all: any } & Record<string, any>>;
export type PrismaAbility = PureAbility<
  [ActionType, PrismaSubjects],
  PrismaQuery
>;

export type RoleAbility = {
  id?: string;
  action: string;
  subject: string;
  conditions?: Record<string, any> | null;
  fields?: string[];
  inverted?: boolean;
  reason?: string | null;
};

export type UserWithRole = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  role: {
    id: string;
    name: string;
    abilities: RoleAbility[];
  } | null;
};

