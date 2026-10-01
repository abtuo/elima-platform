import { Link } from "react-router-dom";

export function LegalLinks({ className = "" }: { className?: string }) {
  return <nav aria-label="Informations légales" className={`flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs ${className}`}>
    <Link to="/legal/terms" className="underline-offset-4 hover:underline">Conditions d’utilisation</Link>
    <Link to="/legal/privacy" className="underline-offset-4 hover:underline">Confidentialité</Link>
    <Link to="/legal/account-deletion" className="underline-offset-4 hover:underline">Suppression de compte</Link>
  </nav>;
}
