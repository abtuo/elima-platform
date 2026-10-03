import {useEffect} from 'react';
import {App} from '@capacitor/app';
import type {PluginListenerHandle} from '@capacitor/core';
import {useAuth} from '@/features/auth/AuthProvider';
import {isPlayBillingAvailable,PlayBilling,restorePlayPurchases} from '@/services/subscriptionService';

/** Recover purchases approved while the app was paused/killed; never grant locally. */
export function BillingSync(){
  const {authenticated,loading,profile}=useAuth();
  useEffect(()=>{
    if(loading||!authenticated||!isPlayBillingAvailable())return;
    let active=true,busy=false;
    const handles:PluginListenerHandle[]=[];
    const sync=async()=>{if(!active||busy)return;busy=true;try{await restorePlayPurchases();}catch{/* Retried on resume or explicit Restore; never block free features. */}finally{busy=false;}};
    const retain=(pending:Promise<PluginListenerHandle>)=>{void pending.then(handle=>{if(active)handles.push(handle);else void handle.remove();}).catch(()=>{});};
    retain(App.addListener('resume',()=>{void sync();}));
    retain(PlayBilling.addListener('purchasesUpdated',()=>{void sync();}));
    void sync();
    return()=>{active=false;for(const handle of handles)void handle.remove();};
  },[authenticated,loading,profile.id]);
  return null;
}
