CREATE TABLE "risk_registers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"kategori_risiko" text NOT NULL,
	"risiko" text NOT NULL,
	"penyebab" text NOT NULL,
	"dampak" text NOT NULL,
	"likelihood" integer NOT NULL,
	"severity" integer NOT NULL,
	"risk_rating" integer NOT NULL,
	"level_risiko" text NOT NULL,
	"mitigasi" text NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"created_by" uuid NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp,
	"rejected_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "risk_registers" ADD CONSTRAINT "risk_registers_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_registers" ADD CONSTRAINT "risk_registers_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_registers" ADD CONSTRAINT "risk_registers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_registers" ADD CONSTRAINT "risk_registers_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;