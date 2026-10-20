import { AdminPageHeader } from "@/components/admin/AdminUI";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { catalogRoles, requireStorePage } from "@/lib/admin-auth";
export default async function NewProductPage(){const{client}=await requireStorePage(catalogRoles);const[{data:categories},{data:grades}]=await Promise.all([client.from("store_categories").select("id,name").eq("is_active",true).order("sort_order"),client.from("store_grade_levels").select("id,label,school_level").eq("is_active",true).order("sort_order")]);return <><AdminPageHeader title="Nouveau produit" description="Créez d’abord le produit et ses variantes, puis ajoutez ses photos." back="/admin/produits"/><ProductEditor categories={categories??[]} grades={grades??[]}/></>}
