import { notion, CRM_DATABASE_ID } from "../notion";
import { resend, MY_EMAIL } from "../resend";

export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case "search_crm":
      return await searchCRM(args.query as string);
    case "create_contact":
      return await createContact(args);
    case "update_contact":
      return await updateContact(args);
    case "set_reminder":
      return await setReminder(args);
    case "send_email":
      return await sendEmail(args);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// Helper to get existing notes and append new note with timestamp
async function appendNote(pageId: string, newNote: string): Promise<string> {
  try {
    const page = await notion.pages.retrieve({ page_id: pageId }) as any;
    const existingNotes = page.properties.Notes?.rich_text?.[0]?.text?.content || "";
    const timestamp = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const formattedNote = `[${timestamp}] ${newNote}`;
    return existingNotes ? `${existingNotes}\n${formattedNote}` : formattedNote;
  } catch {
    return newNote;
  }
}

async function searchCRM(query: string) {
  try {
    const response = await notion.databases.query({
      database_id: CRM_DATABASE_ID,
      filter: {
        property: "Name",
        title: { contains: query },
      },
    });
    if (response.results.length === 0) {
      return { found: false, message: `No contacts found matching "${query}"` };
    }
    const contacts = response.results.map((page: any) => {
      const props = page.properties;
      return {
        id: page.id,
        name: props.Name?.title?.[0]?.text?.content || "",
        type: props.Type?.select?.name || "",
        email: props.Email?.email || "",
        lastContact: props["Last contact"]?.date?.start || "",
        followUpDate: props["Follow Up Date"]?.date?.start || "",
        notes: props.Notes?.rich_text?.[0]?.text?.content || "",
      };
    });
    return { found: true, contacts };
  } catch (error) {
    console.error("Error searching CRM:", error);
    return { error: "Failed to search CRM" };
  }
}

async function createContact(data: Record<string, unknown>) {
  try {
    const properties: any = {
      Name: { title: [{ text: { content: data.name as string } }] },
    };
    if (data.company) {
      properties.Company = { rich_text: [{ text: { content: data.company as string } }] };
    }
    if (data.type) {
      properties.Type = { select: { name: data.type as string } };
    }
    if (data.email) {
      properties.Email = { email: data.email as string };
    }
    if (data.notes) {
      properties.Notes = { rich_text: [{ text: { content: data.notes as string } }] };
    }
    const today = new Date().toISOString().split("T")[0];
    properties["Last contact"] = { date: { start: today } };
    const response = await notion.pages.create({
      parent: { database_id: CRM_DATABASE_ID },
      properties,
    });
    return { success: true, id: response.id, message: `Created contact: ${data.name}` };
  } catch (error) {
    console.error("Error creating contact:", error);
    return { error: "Failed to create contact" };
  }
}

async function updateContact(data: Record<string, unknown>) {
  try {
    const properties: any = {};
    if (data.notes) {
      const updatedNotes = await appendNote(data.contact_id as string, data.notes as string);
      properties.Notes = { rich_text: [{ text: { content: updatedNotes } }] };
    }
    if (data.last_contact) {
      properties["Last contact"] = { date: { start: data.last_contact as string } };
    }
    if (data.follow_up_date) {
      properties["Follow Up Date"] = { date: { start: data.follow_up_date as string } };
    }
    await notion.pages.update({
      page_id: data.contact_id as string,
      properties,
    });
    return { success: true, message: "Contact updated" };
  } catch (error) {
    console.error("Error updating contact:", error);
    return { error: "Failed to update contact" };
  }
}

async function setReminder(data: Record<string, unknown>) {
  try {
    const searchResult = (await searchCRM(data.contact_name as string)) as {
      found?: boolean;
      contacts?: Array<{ id: string; name: string }>;
    };
    if (!searchResult.found) {
      return { error: `Contact "${data.contact_name}" not found. Create them first.` };
    }
    let followUpDate = data.follow_up_date as string;
    if (followUpDate.includes("in")) {
      const match = followUpDate.match(/in (\d+) (day|week|month)s?/i);
      if (match) {
        const amount = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        const date = new Date();
        if (unit === "day") date.setDate(date.getDate() + amount);
        else if (unit === "week") date.setDate(date.getDate() + amount * 7);
        else if (unit === "month") date.setMonth(date.getMonth() + amount);
        followUpDate = date.toISOString().split("T")[0];
      }
    }
    const contact = searchResult.contacts![0];
    const properties: any = { "Follow Up Date": { date: { start: followUpDate } } };
    if (data.note) {
      const updatedNotes = await appendNote(contact.id, data.note as string);
      properties.Notes = { rich_text: [{ text: { content: updatedNotes } }] };
    }
    await notion.pages.update({ page_id: contact.id, properties });
    return { success: true, message: `Reminder set for ${contact.name} on ${followUpDate}` };
  } catch (error) {
    console.error("Error setting reminder:", error);
    return { error: "Failed to set reminder" };
  }
}

async function sendEmail(data: Record<string, unknown>) {
  try {
    await resend.emails.send({
      from: "AI OS <onboarding@resend.dev>",
      to: MY_EMAIL,
      subject: data.subject as string,
      html: data.body as string,
    });
    return { success: true, message: `Email sent: ${data.subject}` };
  } catch (error) {
    console.error("Error sending email:", error);
    return { error: "Failed to send email" };
  }
}
