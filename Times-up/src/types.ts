/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Parent {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface Child {
  id: string;
  parentId: string;
  name: string;
  deviceToken: string;
  batteryPercent: number;
  networkType: string;
  lastSeenAt: string;
  isLocked: boolean;
  platform: 'android' | 'ios' | 'unknown';
  createdAt: string;
}

export enum LogType {
  LOCATION = 'location',
  APP_USAGE = 'app_usage',
  SCREEN_TIME = 'screen_time',
  MESSAGE = 'message',
  WEB_VISIT = 'web_visit',
  INSTALLED_APP = 'installed_app',
  CALL_LOG = 'call_log',
  SMS = 'sms'
}

export interface ActivityLog {
  id: string;
  childId: string;
  logType: LogType;
  data: any; // Dynamic JSON structure based on logType
  occurredAt: string;
}

// Log-specific data structures
export interface LocationData {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface AppUsageData {
  app: string;
  minutes: number;
  category?: string;
}

export interface ScreenTimeData {
  minutes: number;
}

export interface MessageData {
  app: string;
  contact: string;
  direction: 'incoming' | 'outgoing';
  preview: string;
}

export interface WebVisitData {
  url: string;
  title: string;
  domain: string;
}

export interface InstalledAppData {
  package: string;
  name: string;
  installedAt: string;
}

export interface CallLogData {
  number: string;
  name: string;
  type: 'incoming' | 'outgoing' | 'missed';
  duration: number; // in seconds
}

export interface SmsData {
  sender: string;
  body: string;
  direction: 'incoming' | 'outgoing';
}

export enum RuleType {
  BLOCKED_APP = 'blocked_app',
  BLOCKED_WEBSITE = 'blocked_website',
  SCREEN_TIME_LIMIT = 'screen_time_limit',
  BEDTIME = 'bedtime'
}

export interface Rule {
  id: string;
  childId: string;
  ruleType: RuleType;
  config: any; // Specific JSON structure based on ruleType
  enabled: boolean;
}

export enum CommandType {
  LOCK = 'lock',
  UNLOCK = 'unlock',
  RESET = 'reset',
  RING = 'ring',
  LOCATE = 'locate'
}

export enum CommandStatus {
  PENDING = 'pending',
  ACK = 'ack',
  DONE = 'done'
}

export interface Command {
  id: string;
  childId: string;
  command: CommandType;
  status: CommandStatus;
  createdAt: string;
}
