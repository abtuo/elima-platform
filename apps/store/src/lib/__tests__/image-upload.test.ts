import assert from "node:assert/strict";
import test from "node:test";
import { validateStoreImage } from "../image-upload";

test("les uploads image vérifient le contenu et pas uniquement le MIME",async()=>{
  const png=new File([new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0])],"image.png",{type:"image/png"});
  const fake=new File(["contenu texte"],"image.png",{type:"image/png"});
  assert.deepEqual(await validateStoreImage(png),{ok:true,extension:"png"});
  const rejected=await validateStoreImage(fake);assert.equal(rejected.ok,false);if(!rejected.ok)assert.match(rejected.message,/contenu/);
});
