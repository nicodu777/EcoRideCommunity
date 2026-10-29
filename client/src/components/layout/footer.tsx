/**
 * Pied de page (US1) : adresse email de contact et lien vers les mentions légales.
 */
import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-12 pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-4 justify-between">
        <p>© {new Date().getFullYear()} EcoRide - covoiturage écoresponsable</p>
        <nav aria-label="Liens de pied de page" className="flex gap-6">
          <a href="mailto:contact@ecoride.fr" className="hover:text-white">contact@ecoride.fr</a>
          <Link href="/mentions-legales" className="hover:text-white">Mentions légales</Link>
        </nav>
      </div>
    </footer>
  );
}
