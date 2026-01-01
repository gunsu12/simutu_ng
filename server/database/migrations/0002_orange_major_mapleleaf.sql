ALTER TABLE "divisions" ADD COLUMN "site_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "site_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "site_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;