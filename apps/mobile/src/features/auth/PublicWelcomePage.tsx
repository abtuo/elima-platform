import { ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { ElimaLogo } from "@/components/common/ElimaLogo";
import { useAuth } from "@/features/auth/AuthProvider";
import { getProfileHomePath } from "@/types/roles";

export function PublicWelcomePage() {
  const { authenticated, loading, profile } = useAuth();

  return (
    <main className="welcome-screen relative min-h-screen overflow-hidden bg-[#123c2d] text-white">
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <img src="/elima-ecole-connectee.png" alt="" className="welcome-background-image pointer-events-none absolute inset-0 h-full w-full select-none object-cover" />
        <div className="welcome-background-scrim absolute inset-0" />
      </div>

      <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden" aria-hidden="true">
        <span className="welcome-bubble welcome-bubble-1" />
        <span className="welcome-bubble welcome-bubble-2" />
        <span className="welcome-bubble welcome-bubble-3" />
        <span className="welcome-bubble welcome-bubble-4" />
        <span className="welcome-bubble welcome-bubble-5" />
        <span className="welcome-bubble welcome-bubble-6" />
        <span className="welcome-bubble welcome-bubble-7" />
        <span className="welcome-bubble welcome-bubble-8" />
      </div>

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-6 py-14 text-center">
        <div className="rounded-[1.75rem] border border-white/70 bg-white/90 px-6 py-3 shadow-2xl shadow-black/20 backdrop-blur-md">
          <ElimaLogo className="w-32 drop-shadow-sm sm:w-36" />
        </div>
        <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/15 px-4 py-2 text-sm font-semibold shadow-sm backdrop-blur-md">
          <ShieldCheck className="h-4 w-4 text-secondary" /> L’école, les familles et les élèves réunis
        </p>
        <h1 className="welcome-copy mt-6 max-w-3xl font-title text-4xl font-semibold leading-tight drop-shadow-[0_3px_18px_rgba(0,0,0,.45)] sm:text-5xl md:text-6xl">
          Bienvenue sur <span className="text-secondary">Elima</span>
        </h1>
        <p className="welcome-copy welcome-copy-delay mx-auto mt-5 max-w-xl text-base leading-7 text-white/90 drop-shadow sm:text-lg">
          Suivez la scolarité, communiquez avec l’établissement et révisez intelligemment depuis une seule application.
        </p>

        <div className="welcome-copy welcome-copy-delay-2 mt-10 flex w-full max-w-md flex-col gap-3 sm:flex-row">
          {authenticated && !loading ? (
            <Link to={getProfileHomePath(profile)} className="tap inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-secondary px-7 py-4 text-base font-bold text-accent shadow-xl shadow-black/25">
              Continuer vers mon espace <ArrowRight className="h-5 w-5" />
            </Link>
          ) : (
            <>
              <Link to="/auth/login" className="tap inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 text-base font-bold text-white shadow-xl shadow-black/25">
                Connexion <ArrowRight className="h-5 w-5" />
              </Link>
              <Link to="/auth/inscription" className="tap inline-flex flex-1 items-center justify-center rounded-2xl bg-secondary px-8 py-4 text-base font-bold text-accent shadow-xl shadow-black/25">
                Inscription
              </Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
