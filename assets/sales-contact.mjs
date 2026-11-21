export const SALES_EMAIL='contact.arazvera@gmail.com';

export async function copyPublicEmail(clipboard=globalThis.navigator?.clipboard) {
  if (!clipboard || typeof clipboard.writeText!=='function') return false;
  try {
    await clipboard.writeText(SALES_EMAIL);
    return true;
  } catch {
    return false;
  }
}

if (typeof document!=='undefined') {
  for(const button of document.querySelectorAll('[data-copy-email]')){
    button.addEventListener('click',async()=>{
      const target=button.getAttribute('aria-describedby');
      const status=target?document.getElementById(target):null;
      const ok=await copyPublicEmail();
      if(status) status.textContent=ok
        ?'Email address copied. Paste it into your own email application.'
        :'Copy is not available in this browser. Select the email address shown here and send your brief from your inbox.';
    });
  }
}
