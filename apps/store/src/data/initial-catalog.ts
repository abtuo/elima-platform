export type CatalogCandidate = {
  sku: string;
  name: string;
  categorySlug: string;
  productType: "physical" | "book";
  gradeSlugs: string[];
  description: string;
};

const allGrades = ["cp1", "cp2", "ce1", "ce2", "cm1", "cm2", "6e", "5e", "4e", "3e", "2nde", "1re", "terminale"];
const secondary = allGrades.slice(6);

const groups: Array<{ categorySlug: string; grades: string[]; productType?: "physical" | "book"; names: string[] }> = [
  { categorySlug: "cahiers-et-papiers", grades: allGrades, names: [
    "Cahier 100 pages petit format", "Cahier 200 pages petit format", "Cahier 100 pages grand format", "Cahier 200 pages grand format",
    "Cahier de travaux pratiques", "Cahier de dessin petit format", "Cahier de dessin grand format", "Cahier quadrillé", "Cahier à lignes doubles",
    "Bloc-notes scolaire", "Paquet de feuilles simples", "Paquet de copies doubles", "Ramette de papier A4", "Papier calque", "Papier millimétré",
    "Protège-cahier petit format", "Protège-cahier grand format", "Étiquettes scolaires", "Répertoire alphabétique", "Ardoise blanche scolaire",
  ] },
  { categorySlug: "ecriture", grades: allGrades, names: [
    "Stylo bille bleu", "Stylo bille noir", "Stylo bille rouge", "Stylo bille vert", "Crayon graphite HB", "Crayon graphite 2B",
    "Gomme blanche", "Taille-crayon simple", "Taille-crayon avec réservoir", "Porte-mine scolaire", "Mines pour porte-mine",
    "Surligneur jaune", "Surligneur assorti", "Marqueur permanent noir", "Feutre pour ardoise bleu", "Effaceur pour ardoise",
    "Correcteur à ruban", "Stylo-plume scolaire", "Cartouches d’encre bleue", "Boîte de craies blanches",
  ] },
  { categorySlug: "geometrie", grades: secondary, names: [
    "Règle plate 20 cm", "Règle plate 30 cm", "Équerre 45 degrés", "Équerre 60 degrés", "Rapporteur 180 degrés",
    "Compas scolaire", "Kit de géométrie quatre pièces", "Double décimètre", "Règle graduée souple", "Papier pour constructions géométriques",
  ] },
  { categorySlug: "calculatrices", grades: secondary, names: [
    "Calculatrice scolaire quatre opérations", "Calculatrice scientifique collège", "Calculatrice scientifique lycée", "Calculatrice solaire de bureau",
    "Étui de protection pour calculatrice", "Pile compatible calculatrice scolaire",
  ] },
  { categorySlug: "dessin-et-arts", grades: allGrades, names: [
    "Boîte de crayons de couleur", "Boîte de feutres lavables", "Palette de peinture scolaire", "Gouache couleurs assorties",
    "Pinceaux scolaires assortis", "Pot à eau pliable", "Pâte à modeler scolaire", "Papier couleur assorti", "Papier cartonné assorti",
    "Ciseaux scolaires à bouts ronds", "Colle en bâton", "Colle liquide scolaire", "Tablier de dessin", "Craies de couleur",
  ] },
  { categorySlug: "classement-et-accessoires", grades: allGrades, names: [
    "Classeur scolaire grand format", "Jeu d’intercalaires", "Pochette à rabat", "Chemise cartonnée", "Porte-documents scolaire",
    "Protège-documents", "Lot de pochettes transparentes", "Agrafeuse scolaire", "Boîte d’agrafes", "Ruban adhésif transparent",
  ] },
  { categorySlug: "sacs-et-accessoires", grades: allGrades, names: [
    "Sac à dos scolaire primaire", "Sac à dos scolaire secondaire", "Trousse scolaire simple", "Trousse scolaire double compartiment",
    "Gourde scolaire", "Boîte à goûter", "Housse imperméable pour sac", "Étiquette porte-nom pour sac",
  ] },
  { categorySlug: "livres-et-manuels", grades: allGrades, productType: "book", names: [
    "Cahier d’exercices de lecture primaire", "Cahier d’exercices d’écriture primaire", "Cahier d’exercices de mathématiques primaire",
    "Cahier d’exercices de français collège", "Cahier d’exercices de mathématiques collège", "Cahier d’exercices de sciences collège",
    "Recueil d’exercices de français lycée", "Recueil d’exercices de mathématiques lycée", "Recueil d’exercices de sciences physiques lycée",
    "Annales de préparation au BEPC", "Annales de préparation au baccalauréat", "Dictionnaire scolaire français",
  ] },
];

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’']/g, "-").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export const catalogCandidates: CatalogCandidate[] = groups.flatMap((group) => group.names.map((name) => ({
  sku: `CAND-${String(groups.slice(0, groups.indexOf(group)).reduce((sum, item) => sum + item.names.length, 0) + group.names.indexOf(name) + 1).padStart(3, "0")}`,
  name,
  categorySlug: group.categorySlug,
  productType: group.productType ?? "physical",
  gradeSlugs: group.grades,
  description: `Référence candidate « ${name} » à valider par l’équipe commerciale Elima.`,
})));

export type KitCandidate = { slug: string; name: string; description: string; gradeSlug: string; items: Array<{ sku: string; quantity: number }> };
const item = (sku: string, quantity = 1) => ({ sku, quantity });

export const kitCandidates: KitCandidate[] = [
  { slug: "kit-cp1-candidat", name: "Kit candidat CP1", gradeSlug: "cp1", description: "Sélection générique non officielle pour le CP1.", items: [item("CAND-001", 4), item("CAND-025", 3), item("CAND-027"), item("CAND-061")] },
  { slug: "kit-cp2-candidat", name: "Kit candidat CP2", gradeSlug: "cp2", description: "Sélection générique non officielle pour le CP2.", items: [item("CAND-001", 5), item("CAND-021", 2), item("CAND-027"), item("CAND-065")] },
  { slug: "kit-ce1-candidat", name: "Kit candidat CE1", gradeSlug: "ce1", description: "Sélection générique non officielle pour le CE1.", items: [item("CAND-002", 5), item("CAND-021", 3), item("CAND-027"), item("CAND-071")] },
  { slug: "kit-ce2-candidat", name: "Kit candidat CE2", gradeSlug: "ce2", description: "Sélection générique non officielle pour le CE2.", items: [item("CAND-002", 6), item("CAND-025", 2), item("CAND-061"), item("CAND-071")] },
  { slug: "kit-cm1-candidat", name: "Kit candidat CM1", gradeSlug: "cm1", description: "Sélection générique non officielle pour le CM1.", items: [item("CAND-003", 5), item("CAND-021", 3), item("CAND-041"), item("CAND-071")] },
  { slug: "kit-cm2-candidat", name: "Kit candidat CM2", gradeSlug: "cm2", description: "Sélection générique non officielle pour le CM2.", items: [item("CAND-003", 6), item("CAND-021", 3), item("CAND-041"), item("CAND-082")] },
  { slug: "kit-6e-candidat", name: "Kit candidat 6e", gradeSlug: "6e", description: "Sélection générique non officielle pour la 6e.", items: [item("CAND-004", 6), item("CAND-021", 4), item("CAND-047"), item("CAND-051")] },
  { slug: "kit-5e-candidat", name: "Kit candidat 5e", gradeSlug: "5e", description: "Sélection générique non officielle pour la 5e.", items: [item("CAND-004", 6), item("CAND-021", 4), item("CAND-047"), item("CAND-051")] },
  { slug: "kit-4e-candidat", name: "Kit candidat 4e", gradeSlug: "4e", description: "Sélection générique non officielle pour la 4e.", items: [item("CAND-004", 7), item("CAND-021", 4), item("CAND-047"), item("CAND-052")] },
  { slug: "kit-3e-candidat", name: "Kit candidat 3e", gradeSlug: "3e", description: "Sélection générique non officielle pour la 3e.", items: [item("CAND-004", 7), item("CAND-021", 4), item("CAND-047"), item("CAND-052")] },
  { slug: "kit-lycee-candidat", name: "Kit candidat lycée", gradeSlug: "2nde", description: "Sélection générique non officielle pour le lycée.", items: [item("CAND-004", 8), item("CAND-021", 4), item("CAND-047"), item("CAND-053")] },
  { slug: "kit-geometrie-candidat", name: "Kit candidat géométrie", gradeSlug: "6e", description: "Matériel générique de géométrie, à valider.", items: [item("CAND-047"), item("CAND-048"), item("CAND-049"), item("CAND-050")] },
  { slug: "kit-ecriture-candidat", name: "Kit candidat écriture", gradeSlug: "ce1", description: "Matériel générique d’écriture, à valider.", items: [item("CAND-021", 3), item("CAND-025", 2), item("CAND-027"), item("CAND-028")] },
  { slug: "kit-dessin-candidat", name: "Kit candidat dessin", gradeSlug: "cm1", description: "Matériel générique de dessin, à valider.", items: [item("CAND-057"), item("CAND-058"), item("CAND-059"), item("CAND-061")] },
  { slug: "kit-examens-candidat", name: "Kit candidat préparation aux examens", gradeSlug: "3e", description: "Support générique de préparation, sans caractère officiel.", items: [item("CAND-004", 4), item("CAND-021", 4), item("CAND-032", 2), item("CAND-098")] },
];

export { allGrades, slugify };
