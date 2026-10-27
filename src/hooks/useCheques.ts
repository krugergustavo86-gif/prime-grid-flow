import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { onQueryInvalidated, queryClient } from '@/lib/queryClient';
import { toast } from 'sonner';
import type { Cheque, ChequeEvent, ReceiptPayment, ChequeAction } from '@/utils/chequeRules';
import type { Json } from '@/integrations/supabase/types';
export function refreshFinancialViews() {
  for (const key of ['patrimony','transactions','cheques']) queryClient.invalidateQueries({queryKey:[key]});
}
export function useCheques() {
 const [cheques,setCheques]=useState<Cheque[]>([]), [events,setEvents]=useState<ChequeEvent[]>([]), [payments,setPayments]=useState<ReceiptPayment[]>([]);
 const [loading,setLoading]=useState(true), [error,setError]=useState(false);
 const mounted=useRef(false), version=useRef(0);
 const refresh=useCallback(async()=>{
  const v=++version.current;
  try {
   const a:Cheque[]=[],b:ChequeEvent[]=[],c:ReceiptPayment[]=[];
   for(let page=0;page<100;page++) {
    const [x,y,z]=await Promise.all([
     supabase.from('cheques').select('*').order('received_date',{ascending:false}).order('id').range(page*1000,page*1000+999),
     supabase.from('cheque_events').select('*').order('created_at',{ascending:false}).order('id').range(page*1000,page*1000+999),
     supabase.from('receivable_payments').select('*').order('created_at',{ascending:false}).order('id').range(page*1000,page*1000+999)]);
    if(x.error||y.error||z.error) throw x.error||y.error||z.error;
    a.push(...(x.data||[]));b.push(...(y.data||[]));c.push(...(z.data||[]));
    if(!mounted.current||v!==version.current)return;
    if((x.data?.length||0)<1000&&(y.data?.length||0)<1000&&(z.data?.length||0)<1000)break;
   }
   if(mounted.current&&v===version.current){setCheques(a);setEvents(b);setPayments(c);setError(false);}
  }catch{if(mounted.current){setError(true);toast.error('Não foi possível carregar cheques e baixas');}}
  finally{if(mounted.current&&v===version.current)setLoading(false);}
 },[]);
 useEffect(()=>{mounted.current=true;void refresh();const unsub=onQueryInvalidated(['cheques'],()=>void refresh());return()=>{mounted.current=false;version.current++;unsub();};},[refresh]);
 const create=async(data:Json)=>{const r=await supabase.rpc('create_cheque',{_data:data});if(r.error){toast.error(r.error.message);return null;}refreshFinancialViews();return r.data;};
 const move=async(id:string,action:ChequeAction,date:string,data:Json)=>{const r=await supabase.rpc('move_cheque',{_id:id,_action:action,_date:date,_data:data});if(r.error){toast.error(r.error.message);return false;}refreshFinancialViews();return true;};
 const cash=async(id:string,date:string,data:Json)=>{const r=await supabase.rpc('cash_cheque',{_id:id,_date:date,_data:data});if(r.error){toast.error(r.error.message);return false;}refreshFinancialViews();return true;};
 const cashLegacy=async(value:number,date:string,accountId:string,category:string,notes:string)=>{const r=await supabase.rpc('baixar_cheque_legado',{_value:value,_date:date,_account:accountId,_category:category,_notes:notes});if(r.error){toast.error(r.error.message);return false;}refreshFinancialViews();return true;};
 const edit=async(c:Cheque,data:Json)=>{const r=await supabase.rpc('edit_wallet_cheque',{_id:c.id,_expected_updated_at:c.updated_at,_data:data});if(r.error){toast.error(r.error.message);return false;}refreshFinancialViews();return true;};
 const remove=async(c:Cheque,reason:string)=>{const r=await supabase.rpc('delete_wallet_cheque',{_id:c.id,_expected_updated_at:c.updated_at,_reason:reason});if(r.error){toast.error(r.error.message);return false;}refreshFinancialViews();if(r.data){const photo=await supabase.storage.from('cheque-photos').remove([r.data]);if(photo.error)toast.warning('Cheque excluído; não foi possível remover a foto');}return true;};
 return {cheques,events,payments,loading,error,refresh,create,move,cash,cashLegacy,edit,remove};
}
