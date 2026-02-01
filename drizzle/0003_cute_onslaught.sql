CREATE TABLE `mcp_servers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`command` text NOT NULL,
	`args` text,
	`env` text,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mcp_servers_name_unique` ON `mcp_servers` (`name`);--> statement-breakpoint
ALTER TABLE `messages` ADD `thinking` text;