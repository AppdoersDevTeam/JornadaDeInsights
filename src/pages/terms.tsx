import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

export function TermsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-6 sm:px-8 lg:px-10 py-12">
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
          <h1 className="text-4xl font-heading font-bold mb-4">Termos de Serviço</h1>
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
            <h2 className="text-2xl font-heading font-semibold mb-4">1. Aceitação dos Termos</h2>
            <p className="text-muted-foreground mb-4">
              Ao acessar e usar este site, você concorda em cumprir estes Termos de Serviço e todas as leis aplicáveis. Se você não concordar, por favor, abstenha-se de usar o site.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-heading font-semibold mb-4">2. Propriedade Intelectual</h2>
            <p className="text-muted-foreground mb-4">
              Todo o conteúdo deste site, incluindo textos, gráficos, logos e imagens, é propriedade da Jornada de Insights ou de seus fornecedores de conteúdo e é protegido pelas leis de direitos autorais da Nova Zelândia e internacionais. O uso não autorizado é proibido.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-heading font-semibold mb-4">3. Conduta do Usuário</h2>
            <p className="text-muted-foreground mb-4">Os usuários concordam em não:</p>
            <ul className="list-disc pl-6 text-muted-foreground mb-4">
              <li>Usar o site para qualquer finalidade ilegal.</li>
              <li>Tentar obter acesso não autorizado a qualquer parte do site.</li>
              <li>Envolver-se em qualquer atividade que perturbe ou interfira com a funcionalidade do site.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-heading font-semibold mb-4">4. Compras e Pagamentos</h2>
            <p className="text-muted-foreground mb-4">
              Todas as transações são processadas em Dólares Neozelandeses (NZD). Preços e disponibilidade de produtos estão sujeitos a alterações sem aviso prévio. Reservamo-nos o direito de recusar ou cancelar pedidos a nosso critério.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-heading font-semibold mb-4">5. Limitação de Responsabilidade</h2>
            <p className="text-muted-foreground mb-4">
              A Jornada de Insights não será responsável por quaisquer danos indiretos, incidentais ou consequentes decorrentes do uso ou da impossibilidade de usar o site ou seu conteúdo.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-heading font-semibold mb-4">6. Links Externos</h2>
            <p className="text-muted-foreground mb-4">
              Este site pode conter links para sites de terceiros. Não somos responsáveis pelo conteúdo ou práticas desses sites externos.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-heading font-semibold mb-4">7. Alterações nos Termos</h2>
            <p className="text-muted-foreground mb-4">
              Reservamo-nos o direito de modificar estes Termos de Serviço a qualquer momento. As alterações entrarão em vigor imediatamente após a publicação. O uso contínuo do site significa aceitação dos termos atualizados.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-heading font-semibold mb-4">8. Lei Aplicável</h2>
            <p className="text-muted-foreground mb-4">
              Estes termos são regidos pelas leis da Nova Zelândia. Quaisquer disputas serão resolvidas nos tribunais da Nova Zelândia.
            </p>
          </section>
        </motion.div>
      </div>
    </main>
  );
} 