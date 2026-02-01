CREATE TABLE `skills_directories` (
	`id` text PRIMARY KEY NOT NULL,
	`path` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `skills_directories_path_unique` ON `skills_directories` (`path`);