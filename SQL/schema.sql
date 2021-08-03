-- SQL dump generated using DBML (dbml-lang.org)
-- Database: PostgreSQL
-- Generated at: 2021-08-03T22:35:39.579Z

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "username" varchar UNIQUE NOT NULL,
  "role" varchar,
  "created_at" timestamp DEFAULT (now()),
  "active" bool DEFAULT (true)
);

CREATE TABLE "move" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "user_id" uuid NOT NULL,
  "move_name" varchar UNIQUE NOT NULL,
  "created_at" timestamp DEFAULT (now()),
  "active" bool DEFAULT (true)
);

CREATE TABLE "box" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "move_id" uuid NOT NULL,
  "box_name" varchar UNIQUE NOT NULL,
  "box_desc" varchar,
  "created_at" timestamp DEFAULT (now()),
  "active" bool DEFAULT (true)
);

CREATE TABLE "item" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "box_id" uuid NOT NULL,
  "item_name" varchar UNIQUE NOT NULL,
  "item_desc" varchar,
  "created_at" timestamp DEFAULT (now()),
  "active" bool DEFAULT (true)
);

ALTER TABLE "users" ADD CONSTRAINT "user_to_move" FOREIGN KEY ("id") REFERENCES "move" ("user_id");

ALTER TABLE "move" ADD CONSTRAINT "move_to_box" FOREIGN KEY ("id") REFERENCES "box" ("move_id");

ALTER TABLE "box" ADD CONSTRAINT "box_to_item" FOREIGN KEY ("id") REFERENCES "item" ("box_id");
