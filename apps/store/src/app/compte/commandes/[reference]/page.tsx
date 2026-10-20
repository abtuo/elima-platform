import{OrderDetail}from"@/components/OrderDetail";
export default async function AccountOrderPage({params}:{params:Promise<{reference:string}>}){const{reference}=await params;return <div className="store-shell py-10"><OrderDetail reference={reference}/></div>}
