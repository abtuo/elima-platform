import type { Category, Grade, Kit, Product, SchoolLevel } from "./domain";

export const categories: Category[] = [
  { id: "demo-cahiers", slug: "cahiers-et-papiers", name: "Cahiers & papiers", icon: "📒", sortOrder: 10 },
  { id: "demo-ecriture", slug: "ecriture", name: "Écriture", icon: "✏️", sortOrder: 20 },
  { id: "demo-geometrie", slug: "geometrie", name: "Géométrie", icon: "📐", sortOrder: 30 },
  { id: "demo-arts", slug: "dessin-et-arts", name: "Arts & loisirs", icon: "🎨", sortOrder: 40 },
  { id: "demo-sacs", slug: "sacs-et-accessoires", name: "Sacs & trousses", icon: "🎒", sortOrder: 50 },
  { id: "demo-calcul", slug: "calculatrices", name: "Calculatrices", icon: "🧮", sortOrder: 60 },
];

const seller = { id: "elima-demo", slug: "elima-demo", name: "Catalogue de démonstration Elima", verified: false };
const details = [
  ["p1", "lot-cahiers-96-pages", "Lot de 5 cahiers 96 pages", "Cahiers grands carreaux, format 17 × 22 cm, adaptés au quotidien scolaire.", 3500, "📚", "demo-cahiers", ["primaire", "college"], ["CP1", "CP2", "CE1", "CE2", "CM1", "CM2", "6e", "5e"]],
  ["p2", "trousse-geometrie", "Trousse de géométrie", "Règle, équerre, rapporteur et compas réunis dans une pochette solide.", 2800, "📐", "demo-geometrie", ["college", "lycee"], ["6e", "5e", "4e", "3e", "2nde", "1re", "Terminale"]],
  ["p3", "stylos-quatre-couleurs", "Stylos — 4 couleurs", "Écriture fluide en bleu, noir, rouge et vert. Pointe moyenne.", 1200, "🖊️", "demo-ecriture", ["primaire", "college", "lycee"], ["CE1", "CE2", "CM1", "CM2", "6e", "5e", "4e", "3e", "2nde", "1re", "Terminale"]],
  ["p4", "sac-a-dos-ergonomique", "Sac à dos ergonomique", "Compartiments renforcés, bretelles rembourrées et matière facile à nettoyer.", 14900, "🎒", "demo-sacs", ["primaire", "college"], ["CP1", "CP2", "CE1", "CE2", "CM1", "CM2", "6e", "5e", "4e", "3e"]],
  ["p5", "calculatrice-scientifique", "Calculatrice scientifique", "Fonctions scientifiques essentielles pour le collège et le lycée.", 12500, "🧮", "demo-calcul", ["college", "lycee"], ["4e", "3e", "2nde", "1re", "Terminale"]],
  ["p6", "kit-dessin-creatif", "Kit dessin créatif", "Crayons de couleur, feutres, gomme et taille-crayon pour les activités artistiques.", 4900, "🎨", "demo-arts", ["primaire"], ["CP1", "CP2", "CE1", "CE2", "CM1", "CM2"]],
  ["p7", "ardoise-double-face", "Ardoise double face", "Une face blanche et une face quadrillée, avec feutre et effacette.", 1800, "📝", "demo-cahiers", ["primaire"], ["CP1", "CP2", "CE1", "CE2"]],
  ["p8", "ramette-papier-a4", "Ramette papier A4", "500 feuilles blanches 80 g/m² pour impressions et travaux scolaires.", 4200, "📄", "demo-cahiers", ["primaire", "college", "lycee"], ["CP1", "CP2", "CE1", "CE2", "CM1", "CM2", "6e", "5e", "4e", "3e", "2nde", "1re", "Terminale"]],
] as const;

export const products: Product[] = details.map(([id, slug, name, description, amount, imageEmoji, categoryId, levels, grades], index) => {
  const category = categories.find((item) => item.id === categoryId)!;
  const variantId = `${id}-default`;
  return {
    id, slug, name, description, shortDescription: description, category,
    levels: [...levels] as SchoolLevel[], grades: [...grades] as Grade[],
    price: { amount, currency: "XOF" }, imageEmoji, imageAlt: name,
    badge: index === 3 ? "Nouveau" : undefined, popularity: 100 - index * 4,
    createdAt: `2026-10-${String(12 + index).padStart(2, "0")}`,
    variants: [{ id: variantId, sku: `DEMO-${String(index + 1).padStart(3, "0")}`, name: "Modèle standard", attributes: {}, price: { amount, currency: "XOF" }, quantityAvailable: 0, availability: "demo", isDefault: true }],
    defaultVariantId: variantId, seller, availability: "demo", isDemo: true,
  };
});

const kitItems = [{ productId: "p1", variantId: "p1-default", quantity: 2 }, { productId: "p3", variantId: "p3-default", quantity: 1 }, { productId: "p7", variantId: "p7-default", quantity: 1 }];
const kitPrice: Record<SchoolLevel, number> = { primaire: 18500, college: 29500, lycee: 36500 };
export const gradesByLevel: Record<SchoolLevel, Grade[]> = { primaire: ["CP1", "CP2", "CE1", "CE2", "CM1", "CM2"], college: ["6e", "5e", "4e", "3e"], lycee: ["2nde", "1re", "Terminale"] };
export const kits: Kit[] = (Object.entries(gradesByLevel) as [SchoolLevel, Grade[]][]).flatMap(([level, grades]) => grades.map((grade) => ({ id: `kit-${grade.toLowerCase()}`, slug: `kit-essentiel-${grade.toLowerCase()}`, name: `Kit essentiel ${grade}`, grade, level, description: `Une sélection de démonstration des fournitures courantes pour la classe de ${grade}.`, price: { amount: kitPrice[level], currency: "XOF" }, pricingStrategy: "fixed", availability: "demo", items: kitItems, isCustomizableLater: true, isDemo: true })));

export function getProduct(slug: string) { return products.find((product) => product.slug === slug); }
