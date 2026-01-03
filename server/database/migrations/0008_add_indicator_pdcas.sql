CREATE TABLE "indicator_pdcas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_item_id" uuid NOT NULL,
	"pdca_date" timestamp NOT NULL,
	"problem_title" text NOT NULL,
	"step_description" text,
	"plan_description" text,
	"do_description" text,
	"check_study" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "indicator_pdcas" ADD CONSTRAINT "indicator_pdcas_entry_item_id_indicator_entry_items_id_fk" FOREIGN KEY ("entry_item_id") REFERENCES "public"."indicator_entry_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicator_pdcas" ADD CONSTRAINT "indicator_pdcas_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;