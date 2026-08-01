export const ALLOWED_ADMIN_EMAILS = ['devteam@appdoers.co.nz', 'ptasbr2020@gmail.com'];

export function isAdminEmail(email: string | null | undefined): boolean {
  return Boolean(email && ALLOWED_ADMIN_EMAILS.includes(email.toLowerCase()));
}
