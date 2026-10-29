(() => {
  'use strict';

  const styles = `
    #ccTutorToggle{position:fixed;right:18px;bottom:18px;z-index:20;border:1px solid #111;background:#111;color:#fff;padding:12px 16px;font:inherit;font-size:14px;cursor:pointer}
    #ccTutorPanel{position:fixed;right:18px;bottom:76px;z-index:21;width:min(390px,calc(100vw - 24px));height:min(560px,calc(100dvh - 105px));display:flex;flex-direction:column;background:#fff;color:#111;border:1px solid #dedbd6;box-shadow:0 8px 32px #0002}
    #ccTutorPanel[hidden]{display:none}
    .cc-tutor-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:16px;border-bottom:1px solid #dedbd6}
    .cc-tutor-head h2{font-size:20px;margin:0 0 4px;font-weight:400}
    .cc-tutor-head p{font-size:12px;color:#585858;margin:0}
    .cc-tutor-close{border:1px solid #dedbd6;background:#fff;padding:6px 10px;font:inherit;cursor:pointer}
    #ccTutorMessages{flex:1;overflow:auto;padding:12px;background:#faf9f6}
    .cc-tutor-message{margin:0 0 12px;padding:12px;background:#fff;border:1px solid #dedbd6;white-space:pre-wrap;overflow-wrap:anywhere}
    .cc-tutor-message.cc-tutor-user{background:#f1eee9}
    .cc-tutor-message p{margin:0 0 8px}
    .cc-tutor-message pre{margin:8px 0 0;max-height:160px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;background:#f4f6fa;padding:10px;font:12px/1.5 ui-monospace,monospace}
    .cc-tutor-open{margin-top:10px;border:1px solid #111;background:#fff;color:#111;padding:8px 10px;font:inherit;cursor:pointer}
    .cc-tutor-suggestions{display:flex;gap:6px;flex-wrap:wrap;padding:0 12px 10px}
    .cc-tutor-suggestions button{border:1px solid #dedbd6;background:#fff;padding:6px 8px;font:inherit;font-size:12px;cursor:pointer}
    #ccTutorForm{display:flex;gap:8px;padding:12px;border-top:1px solid #dedbd6}
    #ccTutorQuestion{min-width:0;flex:1;border:1px solid #dedbd6;padding:10px;font:inherit}
    #ccTutorForm button{border:1px solid #111;background:#111;color:#fff;padding:9px 12px;font:inherit;cursor:pointer}
    #ccTutorToggle:focus-visible,#ccTutorPanel button:focus-visible,#ccTutorQuestion:focus-visible{outline:2px solid #0007cb;outline-offset:2px}
    @media(max-width:720px){#ccTutorToggle{bottom:76px;right:12px}#ccTutorPanel{right:8px;bottom:132px;width:calc(100vw - 16px);height:min(560px,calc(100dvh - 155px))}}
    @media(prefers-reduced-motion:reduce){#ccTutorPanel{scroll-behavior:auto}}
  `;

  const stopWords = new Set([
    'que', 'como', 'cuando', 'donde', 'para', 'por', 'con', 'sin', 'una', 'uno',
    'unos', 'unas', 'del', 'las', 'los', 'qué', 'cual', 'puedo', 'quiero',
    'hace', 'usar', 'uso', 'es', 'son', 'ser', 'hay', 'mi', 'me', 'de', 'la',
    'el', 'y', 'o', 'a', 'en', 'un', 'al'
  ]);

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function makeIndex() {
    if (typeof C === 'undefined' || !Array.isArray(C)) return [];
    const lessons = C.flatMap(course => {
      const [id, name, track, description, topics] = course;
      if (!Array.isArray(topics)) return [];
      return topics.map((topic, index) => ({
        courseId: id,
        courseName: name,
        track,
        index,
        title: topic[0],
        description: topic[1],
        example: topic[2] || ''
      }));
    });
    const exercises = typeof E === 'undefined' || !Array.isArray(E) ? [] : E.map(exercise => ({
      courseId: '',
      courseName: `${exercise[0]} · práctica`,
      track: exercise[0],
      index: -1,
      title: exercise[1],
      description: `${exercise[2]} Pista: ${exercise[6] || 'Divide el problema en pasos y prueba un caso normal y otro límite.'}`,
      example: ''
    }));
    return [...lessons, ...exercises];
  }

  function search(question) {
    const terms = normalize(question).match(/[a-z0-9+#.-]+/g)?.filter(term => term.length > 1 && !stopWords.has(term)) || [];
    if (!terms.length) return [];

    return makeIndex().map(item => {
      const heading = normalize(`${item.courseName} ${item.track} ${item.title}`);
      const body = normalize(`${item.description} ${item.example}`);
      const searchable = `${heading} ${body}`;
      let score = 0;
      for (const term of terms) {
        if (heading.includes(term)) score += 5;
        else if (body.includes(term)) score += 2;
      }
      if (terms.length > 1 && terms.every(term => searchable.includes(term))) score += 4;
      return { ...item, score };
    }).filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
  }

  function runtimeAnswer(question) {
    if (!/\b(?:ide|editor|ejecut\w*|compil\w*|runtime|motor|instal\w*)\b/.test(normalize(question))) return '';
    return 'El IDE está integrado en la pestaña «IDE interno» y no requiere instalar un programa. El distintivo «Motor» explica qué puede ejecutar cada opción. Java, Kotlin, Node.js y Python se envían al compilador remoto solo después de marcar el consentimiento y pulsar Ejecutar. JavaScript, SQL y los simuladores funcionan en el navegador; SQL.js necesita conexión para cargar el motor. React muestra una vista previa estática, y PL/SQL requiere Oracle para ejecutarse.';
  }

  function createMessage(text, item, isUser = false) {
    const article = document.createElement('article');
    article.className = `cc-tutor-message${isUser ? ' cc-tutor-user' : ''}`;
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    article.append(paragraph);

    if (item?.example) {
      const code = document.createElement('pre');
      code.textContent = item.example;
      article.append(code);
    }

    if (item) {
      const source = document.createElement('p');
      source.textContent = `Fuente: ${item.courseName} · ${item.title}.`;
      article.append(source);
      if (item.courseId) {
        const open = document.createElement('button');
        open.type = 'button';
        open.className = 'cc-tutor-open';
        open.textContent = 'Abrir este tema';
        open.addEventListener('click', () => {
          if (typeof courseId === 'undefined' || typeof page !== 'function') return;
          courseId = item.courseId;
          topicId = item.index;
          page('lesson');
        });
        article.append(open);
      }
    }

    return article;
  }

  function init() {
    if (!document.body || document.getElementById('ccTutorToggle')) return;
    const style = document.createElement('style');
    style.textContent = styles;
    document.head.append(style);

    const toggle = document.createElement('button');
    toggle.id = 'ccTutorToggle';
    toggle.type = 'button';
    toggle.textContent = 'Ayuda para estudiar';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'ccTutorPanel');

    const panel = document.createElement('section');
    panel.id = 'ccTutorPanel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-labelledby', 'ccTutorTitle');
    panel.hidden = true;

    const header = document.createElement('header');
    header.className = 'cc-tutor-head';
    const heading = document.createElement('div');
    const title = document.createElement('h2');
    title.id = 'ccTutorTitle';
    title.textContent = 'Ayuda para estudiar';
    const note = document.createElement('p');
    note.textContent = 'Busca en temarios y prácticas. Tu pregunta no sale del navegador.';
    heading.append(title, note);
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'cc-tutor-close';
    close.textContent = 'Cerrar';
    close.setAttribute('aria-label', 'Cerrar ayuda para estudiar');
    header.append(heading, close);

    const messages = document.createElement('div');
    messages.id = 'ccTutorMessages';
    messages.setAttribute('role', 'log');
    messages.setAttribute('aria-live', 'polite');
    messages.setAttribute('aria-relevant', 'additions');
    messages.append(createMessage('Escribe un concepto o una duda de programación. Te mostraré un fragmento del temario o una pista de práctica y podrás abrir el tema relacionado. La búsqueda usa los materiales incluidos en la aplicación y enlaza la fuente del resultado.'));

    const suggestions = document.createElement('div');
    suggestions.className = 'cc-tutor-suggestions';
    for (const text of ['tipos de datos', 'bucles', 'listas']) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = text;
      suggestions.append(button);
    }

    const form = document.createElement('form');
    form.id = 'ccTutorForm';
    const input = document.createElement('input');
    input.id = 'ccTutorQuestion';
    input.name = 'question';
    input.type = 'search';
    input.maxLength = 240;
    input.placeholder = 'Ej. ¿Para qué sirve una lista?';
    input.setAttribute('aria-label', 'Escribe una duda sobre programación');
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.textContent = 'Buscar';
    form.append(input, submit);

    panel.append(header, messages, suggestions, form);
    document.body.append(toggle, panel);

    function setOpen(open) {
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      if (open) input.focus();
      else toggle.focus();
    }

    function ask(question) {
      const clean = question.trim();
      if (!clean) return;
      messages.append(createMessage(clean, null, true));
      const direct = runtimeAnswer(clean);
      const matches = direct ? [] : search(clean);
      if (direct) {
        messages.append(createMessage(direct));
      } else if (matches.length) {
        const best = matches[0];
        const alternatives = matches.slice(1).filter(item => item.score >= best.score - 2);
        let answer = `${best.courseName} · ${best.title}\n${best.description}`;
        if (alternatives.length) answer += `\n\nTambién pueden servirte: ${alternatives.map(item => `${item.courseName} · ${item.title}`).join('; ')}.`;
        messages.append(createMessage(answer, best));
      } else {
        messages.append(createMessage('No encuentro esa duda en los temarios disponibles. Prueba con el nombre de una tecnología o un concepto, por ejemplo «Java tipos primitivos» o «SQL JOIN». Si el contenido aún no está en la aplicación, esta ayuda no puede inventarlo.'));
      }
      messages.scrollTop = messages.scrollHeight;
      input.value = '';
    }

    toggle.addEventListener('click', () => setOpen(panel.hidden));
    close.addEventListener('click', () => setOpen(false));
    form.addEventListener('submit', event => {
      event.preventDefault();
      ask(input.value);
    });
    suggestions.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (button) ask(button.textContent);
    });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') setOpen(false);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
