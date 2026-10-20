import { AdminPageHeader } from "@/components/admin/AdminUI";
import { CatalogImportWizard } from "@/components/admin/CatalogImportWizard";
import { catalogRoles, requireStorePage } from "@/lib/admin-auth";

export default async function CatalogImportPage() {
  await requireStorePage(catalogRoles);
  return <><AdminPageHeader title="Importer le catalogue" description="Validez chaque donnée avant de créer ou mettre à jour les références. Les imports sont limités, tracés et restent en brouillon." back="/admin/produits" /><CatalogImportWizard /></>;
}
