// Purchase confirmation email (PT/EN), shared by the Stripe webhook and the admin resend.

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const COPY = {
  pt: {
    subject: 'Confirmação de Compra - Jornada de Insights',
    heading: (name) => `Obrigado pela sua compra, ${name}!`,
    body: 'Estamos felizes em confirmar sua compra recente. Você já pode acessar seu conteúdo no seu painel.',
    ebooksTitle: 'Seus eBooks adquiridos:',
    coursesTitle: 'Seus cursos adquiridos:',
    ebooksCta: 'Acessar Meus eBooks',
    coursesCta: 'Acessar Meus Cursos',
  },
  en: {
    subject: 'Purchase Confirmation - Journey of Insights',
    heading: (name) => `Thank you for your purchase, ${name}!`,
    body: 'We are happy to confirm your recent purchase. You can access your content in your dashboard.',
    ebooksTitle: 'Your purchased eBooks:',
    coursesTitle: 'Your purchased courses:',
    ebooksCta: 'Access My eBooks',
    coursesCta: 'Access My Courses',
  },
};

const renderList = (title, items) =>
  items.length === 0
    ? ''
    : `
        <div style="margin: 20px 0;">
          <h2 style="color: #333; margin-bottom: 10px;">${title}</h2>
          <ul style="list-style: none; padding: 0;">
            ${items
              .map(
                (item) => `
                  <li style="margin-bottom: 10px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                    ${escapeHtml(item.title)}
                  </li>`
              )
              .join('')}
          </ul>
        </div>`;

/**
 * @param {{ products: Array<{ type: string, title: string }>, customerName: string, locale?: string, frontendUrl: string }} input
 * @returns {{ subject: string, html: string }}
 */
export const buildPurchaseEmail = ({ products, customerName, locale, frontendUrl }) => {
  const copy = typeof locale === 'string' && locale.toLowerCase().startsWith('en') ? COPY.en : COPY.pt;
  const ebooks = products.filter((product) => product.type !== 'course');
  const courses = products.filter((product) => product.type === 'course');
  const hasCourse = courses.length > 0;
  const ctaTab = hasCourse ? 'courses' : 'ebooks';
  const ctaLabel = hasCourse ? copy.coursesCta : copy.ebooksCta;

  return {
    subject: copy.subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">${copy.heading(escapeHtml(customerName))}</h1>
        <p style="color: #666; line-height: 1.6;">${copy.body}</p>
        ${renderList(copy.coursesTitle, courses)}
        ${renderList(copy.ebooksTitle, ebooks)}
        <div style="text-align: center; margin: 30px 0;">
          <a href="${frontendUrl}/user-dashboard?tab=${ctaTab}"
             style="display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
            ${ctaLabel}
          </a>
        </div>
      </div>
    `,
  };
};
