ALTER TABLE "devices" ADD COLUMN "token_hash" text;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_tokenHash_unique" UNIQUE("token_hash");