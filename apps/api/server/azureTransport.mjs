// Mark only transport/provider failures, never arbitrary validation or parsing errors.
export function providerFailure(error,status) {
  if(status===undefined || status===408 || status===429 || status>=500) error.refundableProviderFailure=true;
  return error;
}
export async function azureFetch(fetchImpl,url,options={}) {
  try { return await fetchImpl(url,{...options,signal:options.signal??AbortSignal.timeout(60000)}); }
  catch(error) { throw providerFailure(error); }
}
export async function azureBody(response,method='text') {
  try { return await response[method](); }
  catch(error) { if(!(error instanceof SyntaxError)) providerFailure(error); throw error; }
}
