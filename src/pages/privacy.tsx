import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

export function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-6 sm:px-8 lg:px-10 py-12 pt-24">
        {/* Back to Home Link */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Button variant="ghost" asChild className="gap-2">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Voltar para Home
            </Link>
          </Button>
        </motion.div>

        {/* Title Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-heading font-bold mb-4 text-foreground">Política de Privacidade</h1>
          <p className="text-muted-foreground">Data de Efetivação: 1 de Março de 2024</p>
        </motion.div>

        {/* Content Sections */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="prose prose-lg dark:prose-invert max-w-none"
        >
          <section className="mb-8">
            <h2 className="text-2xl font-heading font-semibold mb-4 text-foreground">1. Introdução</h2>
            <p className="text-muted-foreground mb-4">
              A Jornada de Insights está comprometida em proteger sua privacidade de acordo com a Lei de Privacidade da Nova Zelândia de 2020. Esta política descreve como coletamos, usamos e protegemos suas informações pessoais.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-heading font-semibold mb-4 text-foreground">2. Informações que Coletamos</h2>
            <p className="text-muted-foreground mb-4">Podemos coletar as seguintes informações pessoais:</p>
            <ul className="list-disc pl-6 text-muted-foreground mb-4">
              <li>Nome e informações de contato</li>
              <li>Informações de faturamento e pagamento</li>
              <li>Credenciais de conta</li>
              <li>Dados de uso e análises</li>
              <li>Qualquer outra informação que você forneça voluntariamente</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-heading font-semibold mb-4 text-foreground">3. Como Usamos Suas Informações</h2>
            <p className="text-muted-foreground mb-4">Suas informações podem ser usadas para:</p>
            <ul className="list-disc pl-6 text-muted-foreground mb-4">
              <li>Processar transações e entregar serviços</li>
              <li>Comunicar-se com você sobre sua conta ou compras</li>
              <li>Enviar newsletters ou materiais promocionais (com seu consentimento)</li>
              <li>Melhorar nosso site e serviços</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-heading font-semibold mb-4 text-foreground">4. Compartilhamento de Dados</h2>
            <p className="text-muted-foreground mb-4">
              Não vendemos ou alugamos suas informações pessoais. Podemos compartilhar dados com provedores de serviços terceiros para fins como processamento de pagamentos e entrega de e-mails, garantindo que eles cumpram os padrões de privacidade.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-heading font-semibold mb-4 text-foreground">5. Segurança de Dados</h2>
            <p className="text-muted-foreground mb-4">
              Implementamos medidas de segurança apropriadas para proteger suas informações pessoais contra acesso não autorizado, alteração ou divulgação.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-heading font-semibold mb-4 text-foreground">6. Acesso e Correção</h2>
            <p className="text-muted-foreground mb-4">
              Você tem o direito de acessar e corrigir suas informações pessoais em nossa posse. Para fazer isso, entre em contato conosco através dos canais abaixo.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-heading font-semibold mb-4 text-foreground">7. Cookies</h2>
            <p className="text-muted-foreground mb-4">
              Nosso site usa cookies para melhorar a experiência do usuário. Você pode optar por desativar os cookies através das configurações do seu navegador, mas isso pode afetar a funcionalidade do site.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-heading font-semibold mb-4 text-foreground">8. Alterações nesta Política</h2>
            <p className="text-muted-foreground mb-4">
              Podemos atualizar esta Política de Privacidade periodicamente. As alterações serão publicadas nesta página com uma data de efetivação atualizada.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-heading font-semibold mb-4 text-foreground">Contato</h2>
            <p className="text-muted-foreground mb-4">
              Se você tiver dúvidas sobre nossa Política de Privacidade, entre em contato conosco:
            </p>
            <div className="bg-muted/30 p-6 rounded-lg">
              <p className="text-muted-foreground mb-2">Jornada de Insights</p>
              <p className="text-muted-foreground mb-2">Email: suporte@jornadadeinsights.com</p>
              <p className="text-muted-foreground">Telefone: +64 9 123 4567</p>
            </div>
          </section>
        </motion.div>
      </div>
    </main>
  );
} 