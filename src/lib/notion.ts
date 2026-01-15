import { Client } from "@notionhq/client";

export const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

export const CRM_DATABASE_ID = process.env.NOTION_CRM_DATABASE_ID!;