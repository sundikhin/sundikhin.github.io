// Shared analytics for the blog. GoatCounter counts page views on its own.
// Click events use a small, fixed set of names prefixed with "blog-". GoatCounter doesn't
// record which page an event happened on, so each event's referrer is set to the current
// page. The dashboard then shows which post a click came from without needing a new event
// name for every post.
document.querySelectorAll('[data-goatcounter-click]').forEach(el => {
  el.dataset.goatcounterReferrer = location.pathname;
});

function trackEvent(name, title) {
  if (window.goatcounter && window.goatcounter.count) {
    window.goatcounter.count({ path: name, title: title, event: true, referrer: location.pathname });
  }
}

// ---------- "Your turn" form ----------
// Any link with data-ask opens a form in a dialog: a centred modal on desktop, a bottom
// sheet on phones. It sends to its own Formspree form, so blog replies arrive with their
// own subject line, separate from the main contact form. Without JavaScript the link still
// goes to the contact section on the home page.
const ASK_ENDPOINT = 'https://formspree.io/f/xrperdyy'; // Hallway Track form, separate from the home contact form

const askTriggers = document.querySelectorAll('[data-ask]');
if (askTriggers.length && window.HTMLDialogElement) {
  const postTitle = document.querySelector('meta[name="post-title"]')?.content || '';
  const dialog = document.createElement('dialog');
  dialog.className = 'ask';
  dialog.setAttribute('aria-labelledby', 'ask-title');
  dialog.innerHTML = `
    <form class="ask-form" action="${ASK_ENDPOINT}" method="POST">
      <span class="ask-handle" aria-hidden="true"></span>
      <button type="button" class="ask-close" aria-label="Close">&times;</button>
      <p class="ask-kicker mono"></p>
      <h2 id="ask-title" class="ask-title"></h2>
      <p class="ask-question"></p>
      <label><span>Name</span><input type="text" name="name" autocomplete="name" required></label>
      <label><span>Email</span><input type="email" name="email" autocomplete="email" required></label>
      <label><span>Thoughts, comments, questions?</span>
        <textarea name="message" rows="5" required placeholder="An answer, a hot take, a &quot;wait, but what about…&quot; — all welcome."></textarea>
      </label>
      <input type="hidden" name="post">
      <input type="hidden" name="page">
      <input type="hidden" name="_subject">
      <!-- Honeypot: hidden from people; bots that fill it in get filtered out -->
      <input type="text" name="_gotcha" class="honeypot" tabindex="-1" autocomplete="off" aria-hidden="true">
      <p class="ask-status" role="status"></p>
      <div class="ask-actions">
        <button type="submit" class="ask-send">Send</button>
        <button type="button" class="ask-cancel">Cancel</button>
      </div>
    </form>
    <div class="ask-done" hidden>
      <p class="ask-kicker mono">Got it</p>
      <h2 class="ask-title">Thanks for stopping by the hallway!</h2>
      <p>Your note is on its way to my inbox.</p>
      <div class="ask-actions"><button type="button" class="ask-send ask-finish">Back to the post</button></div>
    </div>`;
  document.body.appendChild(dialog);

  const form = dialog.querySelector('form');
  const done = dialog.querySelector('.ask-done');
  const status = dialog.querySelector('.ask-status');

  function openAsk(trigger) {
    // A post passes its own "Your turn" question; the blog home uses a general prompt
    const question = trigger.closest('.your-turn')?.querySelector('.your-turn-q')?.textContent.trim();
    dialog.querySelector('.ask-kicker').textContent = postTitle ? 'Your turn · ' + postTitle : 'Hallway Track';
    dialog.querySelector('.ask-title').textContent = question ? 'Join the conversation' : 'Say hi from the hallway';
    dialog.querySelector('.ask-question').textContent = question || 'Questions, ideas for a future post, or just a hello.';
    form.post.value = postTitle || 'Blog home';
    form.page.value = location.href;
    form._subject.value = 'Hallway Track: ' + (postTitle || 'blog');
    form.hidden = false;
    done.hidden = true;
    status.textContent = '';
    document.documentElement.classList.add('ask-open');
    dialog.showModal();
    form.elements.name.focus();
  }

  function closeAsk() { dialog.close(); }
  dialog.addEventListener('close', () => document.documentElement.classList.remove('ask-open'));

  askTriggers.forEach(trigger => trigger.addEventListener('click', event => {
    event.preventDefault();
    openAsk(trigger);
  }));
  dialog.querySelector('.ask-close').addEventListener('click', closeAsk);
  dialog.querySelector('.ask-cancel').addEventListener('click', closeAsk);
  dialog.querySelector('.ask-finish').addEventListener('click', closeAsk);
  // Clicking the dimmed area outside the panel closes it
  dialog.addEventListener('click', event => { if (event.target === dialog) closeAsk(); });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const send = form.querySelector('.ask-send');
    send.disabled = true;
    status.textContent = 'Sending…';
    try {
      const response = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(response.status);
      trackEvent('blog-ask-send', form.post.value);
      form.reset();
      form.hidden = true;
      done.hidden = false;
      dialog.querySelector('.ask-finish').focus();
    } catch {
      status.textContent = "Hmm, that didn't send. Try again in a moment, or use the contact form on the home page.";
    } finally {
      send.disabled = false;
    }
  });
}
