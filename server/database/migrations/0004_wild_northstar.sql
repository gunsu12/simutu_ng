ALTER TABLE "indicator_categories" ADD COLUMN "site_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "indicators" ADD COLUMN "site_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "indicator_categories" ADD CONSTRAINT "indicator_categories_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicators" ADD CONSTRAINT "indicators_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;