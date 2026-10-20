import { NextResponse } from "next/server";
import { catalogRoles, requireStoreApi } from "@/lib/admin-auth";
import { parseCategory } from "@/lib/admin-category-input";
export async function POST(request:Request){const auth=await requireStoreApi(catalogRoles);if(!auth.ok)return NextResponse.json({message:auth.message},{status:auth.status});const input=parseCategory(await request.json().catch(()=>null));if(!input)return NextResponse.json({message:"Catégorie invalide."},{status:400});const{data,error}=await auth.client.from("store_categories").insert(input).select("id").single();return error?NextResponse.json({message:error.code==="23505"?"Ce slug existe déjà.":error.message},{status:400}):NextResponse.json(data,{status:201});}
