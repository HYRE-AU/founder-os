import { Tool } from "../agents/types";

export const notionTools: Tool[] = [
  {
    type: "function",
    function: {
      name: "search_crm",
      description:
        "Search for a contact in the CRM by name or company. Use this to get context about someone before drafting a message.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Name or company to search for",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_contact",
      description:
        "Create a new contact in the CRM. Use this when the user mentions someone new.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Contact name",
          },
          company: {
            type: "string",
            description: "Company name",
          },
          type: {
            type: "string",
            enum: ["investor", "prospect", "advisor", "founder", "other"],
            description: "Relationship type",
          },
          email: {
            type: "string",
            description: "Contact email address",
          },
          notes: {
            type: "string",
            description: "Initial notes about this contact",
          },
        },
        required: ["name", "type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_contact",
      description: "Update an existing contact with new information or notes.",
      parameters: {
        type: "object",
        properties: {
          contact_id: {
            type: "string",
            description: "Notion page ID of the contact",
          },
          notes: {
            type: "string",
            description: "Notes to append",
          },
          last_contact: {
            type: "string",
            description: "Date of last contact (YYYY-MM-DD format)",
          },
          follow_up_date: {
            type: "string",
            description: "Date to follow up (YYYY-MM-DD format)",
          },
        },
        required: ["contact_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_reminder",
      description:
        "Set a reminder to follow up with someone. Updates their follow-up date in the CRM.",
      parameters: {
        type: "object",
        properties: {
          contact_name: {
            type: "string",
            description: "Name of the person to follow up with",
          },
          follow_up_date: {
            type: "string",
            description:
              "When to follow up (YYYY-MM-DD format, or relative like 'in 2 weeks')",
          },
          note: {
            type: "string",
            description: "What to remember for the follow-up",
          },
        },
        required: ["contact_name", "follow_up_date"],
      },
    },
  },
];