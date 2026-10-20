import { normalizeIvorianPhone } from "./phone";

export type AddressInput = { label:string;recipientName:string;phone:string;countryCode:string;city:string;commune:string;neighborhood:string;addressDetails:string;landmark:string|null;instructions:string|null;deliveryZoneId:string|null;isDefault:boolean };
export function parseAddressInput(value:unknown):AddressInput|null {
  if(!value||typeof value!=="object")return null; const input=value as Record<string,unknown>;
  const countryCode=String(input.countryCode||"CI").trim().toUpperCase();
  const rawPhone=String(input.phone||"").trim(); const phone=countryCode==="CI"?normalizeIvorianPhone(rawPhone):rawPhone;
  const result={label:String(input.label||"Adresse").trim().slice(0,60),recipientName:String(input.recipientName||"").trim().slice(0,120),phone:phone||"",countryCode,city:String(input.city||"").trim().slice(0,100),commune:String(input.commune||"").trim().slice(0,100),neighborhood:String(input.neighborhood||"").trim().slice(0,120),addressDetails:String(input.addressDetails||"").trim().slice(0,500),landmark:String(input.landmark||"").trim().slice(0,250)||null,instructions:String(input.instructions||"").trim().slice(0,500)||null,deliveryZoneId:typeof input.deliveryZoneId==="string"&&/^[0-9a-f-]{36}$/i.test(input.deliveryZoneId)?input.deliveryZoneId:null,isDefault:input.isDefault===true||input.isDefault==="true"};
  if(!result.label||!result.recipientName||!result.phone||!result.city||!result.commune||!result.neighborhood||!result.addressDetails||!/^[A-Z]{2}$/.test(countryCode))return null;
  return result;
}
export function addressRow(input:AddressInput,customerId:string){return{customer_id:customerId,label:input.label,recipient_name:input.recipientName,phone:input.phone,country_code:input.countryCode,city:input.city,commune:input.commune,neighborhood:input.neighborhood,address_details:input.addressDetails,landmark:input.landmark,instructions:input.instructions,delivery_zone_id:input.deliveryZoneId,is_default:input.isDefault};}
