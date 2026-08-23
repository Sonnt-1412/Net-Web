CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"code" text NOT NULL,
	"received_at" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"customer" text NOT NULL,
	"phone" text NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"net_info" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" integer NOT NULL,
	"total" integer NOT NULL,
	"actual" integer,
	"note" text DEFAULT '' NOT NULL,
	"stage" text NOT NULL,
	"delivery_status" text NOT NULL,
	"payment_status" text NOT NULL,
	"payment_date" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"cancel_reason" text,
	"worker_gather" text DEFAULT '' NOT NULL,
	"worker_lead" text DEFAULT '' NOT NULL,
	"worker_float" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;