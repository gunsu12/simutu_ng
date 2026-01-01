CREATE TABLE "sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"address" text,
	"email" text,
	"website" text,
	"phone" text,
	"fax" text,
	"site_logo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sites_site_code_unique" UNIQUE("site_code")
);
