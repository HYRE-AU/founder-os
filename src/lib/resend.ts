import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export const MY_EMAIL = process.env.MY_EMAIL!;