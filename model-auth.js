'use strict';
window.ModelAuth=(()=>{
 const config=window.modelingSupabaseConfig;
 const key='sophs-model-auth-v1';let session=null,refreshing=null;
 const headers=()=>({apikey:config.publishableKey,'Content-Type':'application/json'});
 async function authRequest(path,body,token){
  const response=await fetch(config.url+'/auth/v1/'+path,{method:body?'POST':'GET',headers:{...headers(),...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json();if(!response.ok){const error=new Error(data.msg||data.error_description||data.message||'Sign-in could not complete.');error.code=data.code;throw error;}return data;
 }
 function remember(value){session=value;try{value?sessionStorage.setItem(key,JSON.stringify(value)):sessionStorage.removeItem(key);}catch{}}
 async function token(){
  if(!session)return null;
  if(session.expires_at*1000>Date.now()+60000)return session.access_token;
  if(!refreshing)refreshing=authRequest('token?grant_type=refresh_token',{refresh_token:session.refresh_token}).then(remember).catch(error=>{remember(null);throw error;}).finally(()=>{refreshing=null;});
  await refreshing;return session?.access_token;
 }
 async function current(){
  if(!session){try{session=JSON.parse(sessionStorage.getItem(key)||'null');}catch{session=null;}}
  const hash=new URLSearchParams(location.hash.slice(1));
  if(hash.has('access_token')){
   remember({access_token:hash.get('access_token'),refresh_token:hash.get('refresh_token'),expires_at:Number(hash.get('expires_at'))||Math.floor(Date.now()/1000)+Number(hash.get('expires_in')||3600)});
   history.replaceState(null,'',location.pathname+location.search);
  }else if(hash.has('error_description')){const message=hash.get('error_description');history.replaceState(null,'',location.pathname+location.search);throw new Error(message);}
  const bearer=await token();if(!bearer)return null;
  try{return await authRequest('user',null,bearer);}catch(error){remember(null);throw error;}
 }
 async function signIn(email){return authRequest('otp?redirect_to='+encodeURIComponent(location.origin+'/model-login.html'),{email:email.trim(),create_user:false});}
 async function signOut(){const bearer=await token();try{if(bearer)await authRequest('logout?scope=local',{},bearer);}finally{remember(null);}}
 return {current,token,signIn,signOut};
})();
