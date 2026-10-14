import { submitDemoRequest } from '@/lib/demo-request';
export async function POST(request: Request) { return submitDemoRequest(request); }
