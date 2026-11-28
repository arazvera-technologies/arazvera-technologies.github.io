import { createAuthClient } from '@neon/auth';

const base = import.meta.env.VITE_NEON_AUTH_URL;
const $ = id => document.getElementById(id);
const show = (id, yes) => { $(id).hidden = !yes; };
const message = text => { $('message').textContent = text; };
const account = $('account-form'), verification = $('verification-form');
let mode = 'in', verifyEmail = '', busy = false, pendingKey = '';
if (!base) {
  message('Test service is not configured.');
  account.querySelectorAll('input,button').forEach(el => {el.disabled = true;});
  throw new Error('Missing test auth URL');
}
const auth = createAuthClient(base);
function select(next) {
  mode = next;
  show('name-row', next === 'up');
  $('password').autocomplete = next === 'up' ? 'new-password' : 'current-password';
  $('submit-account').textContent = next === 'up' ? 'Create account' : 'Sign in';
  show('account-form', true); show('verification-form', false);
  $('password').value = ''; $('otp').value = '';
  message('');
}
function profile(user) {
  const valid = user && user.emailVerified === true;
  show('profile', Boolean(valid)); show('account-form', !valid);
  show('verification-form', false);
  $('mode-in').hidden = $('mode-up').hidden = Boolean(valid);
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
function requireCode(email) {
  verifyEmail = email;
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
$('mode-in').addEventListener('click',()=>select('in'));
$('mode-up').addEventListener('click',()=>select('up'));
account.addEventListener('submit',e=>{
  e.preventDefault(); run(async()=>{
    const email=$('email').value.trim(), password=$('password').value;
    message('Checking…');
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
    const {error}=await auth.emailOtp.verifyEmail({email:verifyEmail,otp});
    $('otp').value='';
    if (error) {message('Code invalid or expired. Request a new one.');return;}
    if (await refresh()) message('Email verified. You are signed in.');
    else {select('in');message('Email verified. Sign in with your password.');}
  });
});
$('resend').addEventListener('click',()=>run(async()=>{
  if (!verifyEmail) return;
  const {error}=await auth.emailOtp.sendVerificationOtp({email:verifyEmail,type:'email-verification'});
  message(error?'Unable to send a new code. Try later.':'If eligible, a new code has been requested.');
}));
$('signout').addEventListener('click',()=>run(async()=>{
  const {error}=await auth.signOut();
  if(error){message('Sign-out failed. Try again.');return;}
  profile(null);select('in');message('Signed out.');
}));
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
