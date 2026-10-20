import { NextResponse } from "next/server";
import { catalogRoles, requireStoreApi } from "@/lib/admin-auth";
import { parseCategory } from "@/lib/admin-category-input";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){const{id}=await params;const auth=await requireStoreApi(catalogRoles);if(!auth.ok)return NextResponse.json({message:auth.message},{status:auth.status});const input=parseCategory(await request.json().catch(()=>null));if(!input)return NextResponse.json({message:"Catégorie invalide."},{status:400});const{error}=await auth.client.from("store_categories").update(input).eq("id",id);return error?NextResponse.json({message:error.code==="23505"?"Ce slug existe déjà.":error.message},{status:400}):NextResponse.json({ok:true});}
