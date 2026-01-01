CREATE TABLE "divisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "divisions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nik" text NOT NULL,
	"full_name" text NOT NULL,
	"unit_id" uuid,
	"identity_number" text,
	"phone_number" text,
	"picture" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "employees_nik_unique" UNIQUE("nik")
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_code" text NOT NULL,
	"division_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"location" text,
	"head_of_unit" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "units_unit_code_unique" UNIQUE("unit_code")
);
--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_head_of_unit_employees_id_fk" FOREIGN KEY ("head_of_unit") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;