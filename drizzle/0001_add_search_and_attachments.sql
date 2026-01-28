-- Migration: Add search index and attachments table
-- This migration adds FTS5 full-text search and attachments support

-- 1. Create attachments table
CREATE TABLE IF NOT EXISTS `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`data` blob NOT NULL,
	`note` text,
	`size` integer NOT NULL,
	`width` integer,
	`height` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint

-- 2. Create FTS5 virtual table for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
	content_type,
	content_id,
	conversation_id,
	searchable_text,
	tokenize='porter unicode61'
);

--> statement-breakpoint

-- 3. Trigger: Index conversation titles on INSERT
CREATE TRIGGER IF NOT EXISTS search_index_conversation_insert
AFTER INSERT ON conversations
BEGIN
	INSERT INTO search_index(content_type, content_id, conversation_id, searchable_text)
	VALUES ('conversation_title', NEW.id, NEW.id, NEW.title);
END;

--> statement-breakpoint

-- 4. Trigger: Update conversation title index on UPDATE
CREATE TRIGGER IF NOT EXISTS search_index_conversation_update
AFTER UPDATE OF title ON conversations
BEGIN
	DELETE FROM search_index WHERE content_type = 'conversation_title' AND content_id = OLD.id;
	INSERT INTO search_index(content_type, content_id, conversation_id, searchable_text)
	VALUES ('conversation_title', NEW.id, NEW.id, NEW.title);
END;

--> statement-breakpoint

-- 5. Trigger: Remove conversation from index on DELETE
CREATE TRIGGER IF NOT EXISTS search_index_conversation_delete
AFTER DELETE ON conversations
BEGIN
	DELETE FROM search_index WHERE conversation_id = OLD.id;
END;

--> statement-breakpoint

-- 6. Trigger: Index messages on INSERT
CREATE TRIGGER IF NOT EXISTS search_index_message_insert
AFTER INSERT ON messages
BEGIN
	INSERT INTO search_index(content_type, content_id, conversation_id, searchable_text)
	VALUES ('message', NEW.id, NEW.conversation_id, NEW.content);
END;

--> statement-breakpoint

-- 7. Trigger: Update message index on UPDATE
CREATE TRIGGER IF NOT EXISTS search_index_message_update
AFTER UPDATE OF content ON messages
BEGIN
	DELETE FROM search_index WHERE content_type = 'message' AND content_id = OLD.id;
	INSERT INTO search_index(content_type, content_id, conversation_id, searchable_text)
	VALUES ('message', NEW.id, NEW.conversation_id, NEW.content);
END;

--> statement-breakpoint

-- 8. Trigger: Remove message from index on DELETE
CREATE TRIGGER IF NOT EXISTS search_index_message_delete
AFTER DELETE ON messages
BEGIN
	DELETE FROM search_index WHERE content_id = OLD.id AND content_type IN ('message', 'attachment_note');
END;

--> statement-breakpoint

-- 9. Trigger: Index tool calls on INSERT
CREATE TRIGGER IF NOT EXISTS search_index_tool_call_insert
AFTER INSERT ON tool_calls
BEGIN
	INSERT INTO search_index(content_type, content_id, conversation_id, searchable_text)
	SELECT 'tool_call', NEW.id, m.conversation_id, NEW.name || ' ' || NEW.input
	FROM messages m WHERE m.id = NEW.message_id;
END;

--> statement-breakpoint

-- 10. Trigger: Remove tool call from index on DELETE
CREATE TRIGGER IF NOT EXISTS search_index_tool_call_delete
AFTER DELETE ON tool_calls
BEGIN
	DELETE FROM search_index WHERE content_type = 'tool_call' AND content_id = OLD.id;
END;

--> statement-breakpoint

-- 11. Trigger: Index tool results on INSERT
CREATE TRIGGER IF NOT EXISTS search_index_tool_result_insert
AFTER INSERT ON tool_results
BEGIN
	INSERT INTO search_index(content_type, content_id, conversation_id, searchable_text)
	SELECT 'tool_result', NEW.id, m.conversation_id, NEW.output
	FROM tool_calls tc
	JOIN messages m ON m.id = tc.message_id
	WHERE tc.id = NEW.tool_call_id;
END;

--> statement-breakpoint

-- 12. Trigger: Remove tool result from index on DELETE
CREATE TRIGGER IF NOT EXISTS search_index_tool_result_delete
AFTER DELETE ON tool_results
BEGIN
	DELETE FROM search_index WHERE content_type = 'tool_result' AND content_id = OLD.id;
END;

--> statement-breakpoint

-- 13. Trigger: Index attachment notes on INSERT
CREATE TRIGGER IF NOT EXISTS search_index_attachment_insert
AFTER INSERT ON attachments
WHEN NEW.note IS NOT NULL AND NEW.note != ''
BEGIN
	INSERT INTO search_index(content_type, content_id, conversation_id, searchable_text)
	SELECT 'attachment_note', NEW.id, m.conversation_id, NEW.note
	FROM messages m WHERE m.id = NEW.message_id;
END;

--> statement-breakpoint

-- 14. Trigger: Update attachment note index on UPDATE
CREATE TRIGGER IF NOT EXISTS search_index_attachment_update
AFTER UPDATE OF note ON attachments
BEGIN
	DELETE FROM search_index WHERE content_type = 'attachment_note' AND content_id = OLD.id;
	INSERT INTO search_index(content_type, content_id, conversation_id, searchable_text)
	SELECT 'attachment_note', NEW.id, m.conversation_id, NEW.note
	FROM messages m WHERE m.id = NEW.message_id
	WHERE NEW.note IS NOT NULL AND NEW.note != '';
END;

--> statement-breakpoint

-- 15. Trigger: Remove attachment from index on DELETE
CREATE TRIGGER IF NOT EXISTS search_index_attachment_delete
AFTER DELETE ON attachments
BEGIN
	DELETE FROM search_index WHERE content_type = 'attachment_note' AND content_id = OLD.id;
END;
