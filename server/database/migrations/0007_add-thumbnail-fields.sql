CREATE TABLE "indicator_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_code" text NOT NULL,
	"unit_id" uuid NOT NULL,
	"entry_date" timestamp NOT NULL,
	"entry_frequency" text NOT NULL,
	"notes" text,
	"status" text DEFAULT 'proposed' NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"auditor_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "indicator_entries_entry_code_unique" UNIQUE("entry_code")
);
--> statement-breakpoint
CREATE TABLE "indicator_entry_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"indicator_entry_id" uuid NOT NULL,
	"indicator_id" uuid NOT NULL,
	"numerator_value" numeric,
	"denominator_value" numeric,
	"skor" numeric,
	"numerator_denominator_result" numeric,
	"is_already_checked" boolean DEFAULT false NOT NULL,
	"is_need_pdca" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "divisions" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "picture_thumbnail" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "indicator_categories" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "indicators" ADD COLUMN "target_weight" numeric DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "indicators" ADD COLUMN "entry_frequency" text DEFAULT 'monthly' NOT NULL;--> statement-breakpoint
ALTER TABLE "indicators" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "site_logo_thumbnail" text;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "indicator_entries" ADD CONSTRAINT "indicator_entries_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicator_entries" ADD CONSTRAINT "indicator_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicator_entries" ADD CONSTRAINT "indicator_entries_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicator_entry_items" ADD CONSTRAINT "indicator_entry_items_indicator_entry_id_indicator_entries_id_fk" FOREIGN KEY ("indicator_entry_id") REFERENCES "public"."indicator_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicator_entry_items" ADD CONSTRAINT "indicator_entry_items_indicator_id_indicators_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicators"("id") ON DELETE cascade ON UPDATE no action;