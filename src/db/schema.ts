import { databaseUrl, isPostgresUrl } from "@/server/config";
import * as pg from "./schema.pg";
import * as sqlite from "./schema.sqlite";

function active() {
  return isPostgresUrl(databaseUrl()) ? pg : sqlite;
}

type SqliteSchema = typeof sqlite;

export const users = active().users as SqliteSchema["users"];
export const organizations = active().organizations as SqliteSchema["organizations"];
export const memberships = active().memberships as SqliteSchema["memberships"];
export const projects = active().projects as SqliteSchema["projects"];
export const workflows = active().workflows as SqliteSchema["workflows"];
export const workflowVersions = active().workflowVersions as SqliteSchema["workflowVersions"];
export const workflowNodes = active().workflowNodes as SqliteSchema["workflowNodes"];
export const workflowEdges = active().workflowEdges as SqliteSchema["workflowEdges"];
export const executions = active().executions as SqliteSchema["executions"];
export const executionSteps = active().executionSteps as SqliteSchema["executionSteps"];
export const approvals = active().approvals as SqliteSchema["approvals"];
export const integrations = active().integrations as SqliteSchema["integrations"];
export const secrets = active().secrets as SqliteSchema["secrets"];
export const templates = active().templates as SqliteSchema["templates"];
export const auditLogs = active().auditLogs as SqliteSchema["auditLogs"];
export const usageEvents = active().usageEvents as SqliteSchema["usageEvents"];
export const schema = active().schema as SqliteSchema["schema"];
