const clean=value=>String(value??'').trim();
const PERSISTED_VALUE_KEYS=Object.freeze(['coins','gold','resource','res','ore','ingot','wood','food','mana','score','level','zone','chapter','power','factory','drones','stage','day','xp']);

function stableStorage(value={}){return JSON.stringify(value||{});}
function normalizedValue(value){const n=Number(value);return Number.isFinite(n)?n:clean(value);}
function criticalState(view={}){
  const out={};
  for(const key of PERSISTED_VALUE_KEYS){
    const value=view?.values?.[key];
    if(value!==undefined&&value!==null&&value!=='')out[`value:${key}`]=normalizedValue(value);
  }
  for(const [key,value] of Object.entries(view?.persistedState||{})){
    const k=clean(key);if(k)out[`persisted:${k}`]=normalizedValue(value);
  }
  return out;
}

export function evaluateSaveRestoreEvidence({required=false,storageBefore={},storageAfter={},beforeView={},reloadView={}}={}){
  if(required!==true)return{required:false,pass:true,status:'NOT_APPLICABLE_NO_SAVE_CONTRACT',storageStableAcrossReload:true,criticalStateObserved:false,criticalStateMatch:true,comparableKeys:[],mismatches:[]};
  const storageStableAcrossReload=stableStorage(storageBefore)===stableStorage(storageAfter);
  const before=criticalState(beforeView),after=criticalState(reloadView),comparableKeys=Object.keys(before).filter(key=>Object.prototype.hasOwnProperty.call(after,key));
  const mismatches=comparableKeys.filter(key=>JSON.stringify(before[key])!==JSON.stringify(after[key])).map(key=>({key,before:before[key],after:after[key]}));
  const criticalStateObserved=comparableKeys.length>0,criticalStateMatch=criticalStateObserved&&mismatches.length===0;
  const pass=storageStableAcrossReload&&criticalStateMatch;
  let status='PASS';
  if(!storageStableAcrossReload)status='STORAGE_BYTES_CHANGED_ON_RELOAD';
  else if(!criticalStateObserved)status='CRITICAL_GAMEPLAY_STATE_NOT_EXPOSED';
  else if(!criticalStateMatch)status='CRITICAL_GAMEPLAY_STATE_MISMATCH';
  return{required:true,pass,status,storageStableAcrossReload,criticalStateObserved,criticalStateMatch,comparableKeys,mismatches:mismatches.slice(0,20)};
}

export const SAVE_RESTORE_PERSISTED_VALUE_KEYS=PERSISTED_VALUE_KEYS;
