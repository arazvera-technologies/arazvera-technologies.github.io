import { createAuthClient } from '@neon/auth';

const base = import.meta.env.VITE_NEON_AUTH_URL;
const $ = id => document.getElementById(id);
const show = (id, yes) => { $(id).hidden = !yes; };
const message = text => { $('message').textContent = text; };
const account = $('account-form'), verification = $('verification-form');
let mode = 'otp', verifyEmail = '', busy = false, pendingKey = '', codePurpose = 'sign-in', resendAt = 0;
if (!base) {
  message('Test service is not configured.');
  account.querySelectorAll('input,button').forEach(el => {el.disabled = true;});
  throw new Error('Missing test auth URL');
}
const auth = createAuthClient(base);
function select(next) {
  mode = next;
  show('name-row', next === 'up');
  show('password-row', next !== 'otp');
  $('password').required = next !== 'otp';
  $('password').disabled = next === 'otp';
  for (const [id,value] of [['mode-otp','otp'],['mode-in','in'],['mode-up','up']]) $(id).setAttribute('aria-pressed',String(next===value));
  $('password').autocomplete = next === 'up' ? 'new-password' : 'current-password';
  $('submit-account').textContent = next === 'otp' ? 'Send sign-in code' : next === 'up' ? 'Create account' : 'Sign in';
  show('account-form', true); show('verification-form', false);
  $('password').value = ''; $('otp').value = '';
  message('');
}
function profile(user) {
  const valid = user && user.emailVerified === true;
  show('profile', Boolean(valid)); show('account-form', !valid);
  show('google-option', !valid);
  $('quote-result').textContent = '';
  show('verification-form', false);
  $('mode-otp').hidden = $('mode-in').hidden = $('mode-up').hidden = Boolean(valid);
  $('profile-name').textContent = valid ? user.name || 'Customer' : '';
  $('profile-email').textContent = valid ? user.email || '' : '';
  if (!valid) { $('request-list').replaceChildren(); $('request-form').reset(); pendingKey = ''; }
  $('password').value = ''; $('otp').value = '';
  return Boolean(valid);
}
async function refresh() {
  const {data,error} = await auth.getSession();
  if (error) return false;
  const valid=profile(data?.user);
  if (valid) await listRequests();
  return valid;
}
function requireCode(email, purpose = 'email-verification') {
  verifyEmail = email;
  codePurpose = purpose;
  resendAt = Date.now()+60000;
  $('code-heading').textContent = purpose === 'sign-in' ? 'Enter your sign-in code' : 'Verify your email';
  $('submit-code').textContent = purpose === 'sign-in' ? 'Sign in' : 'Verify email';
  $('password').value = '';
  show('account-form', false); show('verification-form', true);
  message('Check your email for the verification code.');
}
async function run(fn) {
  if (busy) return;
  busy = true;
  const buttons = [...document.querySelectorAll('button')];
  buttons.forEach(b => b.disabled = true);
  try { await fn(); } catch { message('Unable to complete the request. Please try again.'); }
  finally { busy = false; buttons.forEach(b => b.disabled = false); }
}
$('google-signin').addEventListener('click',()=>run(async()=>{
  const {error}=await auth.signIn.social({provider:'google',callbackURL:'https://arazvera-store.onrender.com/customer-preview/'});
  if(error){message('Google sign-in is unavailable. Try email code instead.');return;}
  if(await refresh())message('Signed in to the test account.');
}));
$('mode-otp').addEventListener('click',()=>select('otp'));
$('change-email').addEventListener('click',()=>select(mode));
$('mode-in').addEventListener('click',()=>select('in'));
$('mode-up').addEventListener('click',()=>select('up'));
account.addEventListener('submit',e=>{
  e.preventDefault(); run(async()=>{
    const email=$('email').value.trim(), password=$('password').value;
    message('Checking…');
    if (mode === 'otp') {
      const {error}=await auth.emailOtp.sendVerificationOtp({email,type:'sign-in'});
      if(error){message('Unable to request a code. Please try again later.');return;}
      requireCode(email,'sign-in'); return;
    }
    if (mode === 'up') {
      const {error}=await auth.signUp.email({email,password,name:$('name').value.trim()||'Customer'});
      if (error) { message('Account could not be created. Try signing in or use a different test email.'); return; }
      requireCode(email); return;
    }
    const {error}=await auth.signIn.email({email,password});
    if (error) {
      if (error.code === 'EMAIL_NOT_VERIFIED') {requireCode(email);return;}
      message('Sign-in failed. Check your email and password.'); return;
    }
    if (!await refresh()) message('No verified session was found.');
    else message('Signed in to the test account.');
  });
});
verification.addEventListener('submit',e=>{
  e.preventDefault();run(async()=>{
    const otp=$('otp').value.trim();
    const {error}=codePurpose==='sign-in' ? await auth.signIn.emailOtp({email:verifyEmail,otp}) : await auth.emailOtp.verifyEmail({email:verifyEmail,otp});
    $('otp').value='';
    if (error) {message('Code invalid or expired. Request a new one.');return;}
    if (await refresh()) message('Email verified. You are signed in.');
    else {select('in');message('Email verified. Sign in with your password.');}
  });
});
$('resend').addEventListener('click',()=>run(async()=>{
  if (!verifyEmail) return;
  if(Date.now()<resendAt){message('Please wait one minute before requesting another code.');return;}
  resendAt=Date.now()+60000;
  const {error}=await auth.emailOtp.sendVerificationOtp({email:verifyEmail,type:codePurpose});
  message(error?'Unable to send a new code. Try later.':'If eligible, a new code has been requested.');
}));
$('signout').addEventListener('click',()=>run(async()=>{
  const {error}=await auth.signOut();
  if(error){message('Sign-out failed. Try again.');return;}
  profile(null);select('otp');message('Signed out.');
}));
select('otp');
run(async()=>{if(await refresh())message('Test session restored.');});

async function apiRequest(method, body) {
  const {data,error}=await auth.token();
  if (error || !data?.token) throw new Error('No token');
  const response=await fetch('/api/demo/customer/requests',{
    method,headers:{Authorization:'Bearer '+data.token,...(body?{'Content-Type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',credentials:'omit'});
  if(!response.ok) throw new Error('Request unavailable');
  return response.json();
}
async function listRequests() {
  const list=$('request-list');
  list.replaceChildren();
  try{
    const {requests}=await apiRequest('GET');
    for(const request of requests){
      const li=document.createElement('li');
      li.textContent=request.kind+' · '+request.subject+' · '+request.status+' · '+request.id;
      list.append(li);
    }
    if(!requests.length) {const li=document.createElement('li');li.textContent='No test requests yet.';list.append(li);}
  }catch{const li=document.createElement('li');li.textContent='Test request service is not available yet.';list.append(li);}
}
$('request-form').addEventListener('input',()=>{pendingKey='';});
$('request-form').addEventListener('submit',e=>{
  e.preventDefault();run(async()=>{
    pendingKey ||= crypto.randomUUID();
    await apiRequest('POST',{kind:$('request-kind').value,subject:$('request-subject').value,description:$('request-description').value,request_key:pendingKey});
    pendingKey='';$('request-form').reset();await listRequests();message('Test request received.');
  });
});
$('reload-requests').addEventListener('click',()=>run(listRequests));

$('quote-form').addEventListener('input',()=>{$('quote-result').textContent='';});
$('quote-form').addEventListener('submit',e=>{e.preventDefault();run(async()=>{
  const out=$('quote-result');out.textContent='Checking current rate…';
  try{const params=new URLSearchParams({usd:$('quote-usd').value,asset:$('quote-asset').value});
  const response=await fetch('/api/demo/crypto-quote?'+params,{cache:'no-store'});
  if(!response.ok)throw new Error('Rate unavailable');const q=await response.json();
  if(q.payment_enabled!==false||q.transfer_requested!==false)throw new Error('Unexpected quote');
  out.textContent='$'+q.usd+' USD ≈ '+q.estimated_amount+' '+q.asset+' · '+q.source+' · Estimate only — do not send funds.';
  }catch{out.textContent='A fresh rate is unavailable. Try again later. No payment was requested.';}
});});
