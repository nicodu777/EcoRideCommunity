/**
 * Mentions légales et informations sur les données personnelles (RGPD).
 */
export default function LegalNotice() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-6 text-slate-800">
      <h1 className="text-3xl font-bold text-slate-900">Mentions légales</h1>

      <section>
        <h2 className="text-xl font-semibold mb-2">Éditeur</h2>
        <p>EcoRide - projet réalisé dans le cadre du titre professionnel Développeur Web et Web Mobile (Studi).
          Contact : <a className="text-eco-green underline" href="mailto:contact@ecoride.fr">contact@ecoride.fr</a>.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Hébergement</h2>
        <p>Application hébergée sur Replit (Replit, Inc., San Francisco, États-Unis). Authentification fournie par Google Firebase.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Données personnelles</h2>
        <p>
          Les données collectées (nom, prénom, email, téléphone facultatif, trajets et réservations) servent uniquement
          au fonctionnement du service de covoiturage. Les mots de passe ne sont jamais stockés en clair.
          Conformément au RGPD, vous pouvez demander l'accès, la rectification ou la suppression de vos données
          en écrivant à l'adresse de contact ci-dessus.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Cookies</h2>
        <p>EcoRide n'utilise aucun cookie publicitaire. Seules les données techniques nécessaires à la connexion sont conservées par votre navigateur.</p>
      </section>
    </main>
  );
}
