CREATE TABLE "indicator_entry_verification_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"indicator_entry_id" uuid NOT NULL,
	"previous_status" text NOT NULL,
	"new_status" text NOT NULL,
	"notes" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "indicator_pdcas" ADD COLUMN "action" text;--> statement-breakpoint
ALTER TABLE "indicator_entry_verification_logs" ADD CONSTRAINT "indicator_entry_verification_logs_indicator_entry_id_indicator_entries_id_fk" FOREIGN KEY ("indicator_entry_id") REFERENCES "public"."indicator_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicator_entry_verification_logs" ADD CONSTRAINT "indicator_entry_verification_logs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;