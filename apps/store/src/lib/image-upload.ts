export const MAX_STORE_IMAGE_BYTES = 8 * 1024 * 1024;
export const storeImageExtensions:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/avif":"avif"};

function startsWith(bytes:Uint8Array,signature:number[]){return signature.every((value,index)=>bytes[index]===value);}

export async function validateStoreImage(file:File):Promise<{ok:true;extension:string}|{ok:false;message:string}>{
  const extension=storeImageExtensions[file.type];
  if(!extension||file.size===0||file.size>MAX_STORE_IMAGE_BYTES)return{ok:false,message:"Image JPEG, PNG, WebP ou AVIF de 8 Mo maximum requise."};
  const bytes=new Uint8Array(await file.slice(0,32).arrayBuffer());
  const valid=file.type==="image/jpeg"?startsWith(bytes,[0xff,0xd8,0xff])
    :file.type==="image/png"?startsWith(bytes,[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])
    :file.type==="image/webp"?startsWith(bytes,[0x52,0x49,0x46,0x46])&&String.fromCharCode(...bytes.slice(8,12))==="WEBP"
    :String.fromCharCode(...bytes.slice(4,8))==="ftyp"&&/avif|avis/.test(String.fromCharCode(...bytes));
  return valid?{ok:true,extension}:{ok:false,message:"Le contenu du fichier ne correspond pas au format d’image annoncé."};
}
