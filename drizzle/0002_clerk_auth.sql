ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "age_confirmed_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "clerk_user_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "users_clerk_idx" ON "users" USING btree ("clerk_user_id");