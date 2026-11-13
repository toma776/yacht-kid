'use client';
// Contactul v5: în stânga titlul, textul și canalele directe (telefon, email, WhatsApp, adresă); în dreapta formularul
// din Brain. Formularul de contact nu trimite încă (ca pe site): validează câmpurile, iar la „Trimite” spune limpede că
// solicitarea nu a plecat și arată canalele directe. Datele completate rămân în formular.
import {useRef, useState} from 'react';
import {Icon} from '../../../site/ui/Icons.jsx';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Contact({data, firma, labels, t}) {
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);   // null | 'invalid' | 'not-sent'
  const formRef = useRef(null);
  if (!data) return null;
  const {form} = data, f = firma, L = labels;
  const byName = Object.fromEntries((form?.fields ?? []).map(x => [x.name, x]));
  // Telefonul și emailul, amândouă opționale: măcar unul trebuie completat
  const either = byName.email && byName.phone && !byName.email.required && !byName.phone.required;

  const validate = fd => {
    const e = {};
    for (const x of form.fields) {
      const v = (fd.get(x.name) ?? '').toString().trim();
      if (x.type === 'checkbox') { if (x.required && !fd.get(x.name)) e[x.name] = t.errConsent; continue; }
      if (x.required && !v) e[x.name] = t.errRequired;
      else if (x.type === 'email' && v && !EMAIL.test(v)) e[x.name] = t.errEmail;
      else if (x.type === 'tel' && v && v.replace(/\D/g, '').length < 8) e[x.name] = t.errPhone;
    }
    if (either && !(fd.get('email') ?? '').toString().trim() && !(fd.get('phone') ?? '').toString().trim()) e.contact = t.errContact;
    return e;
  };

  const onSubmit = ev => {
    ev.preventDefault();
    const e = validate(new FormData(ev.currentTarget));
    setErrors(e);
    if (Object.keys(e).length) {
      setStatus('invalid');
      const first = Object.keys(e)[0] === 'contact' ? 'email' : Object.keys(e)[0];
      formRef.current?.querySelector(`[name="${first}"]`)?.focus();
      return;
    }
    setStatus('not-sent');
  };

  const consent = form?.privacy
    ? form.consent.split(/(politicii de confidențialitate|privacy policy)/).map((part, i) => i % 2 ? <a key={i} href={form.privacy} target="_blank" rel="noopener">{part}</a> : part)
    : form?.consent;

  // Câmpurile pe jumătate de rând; dacă sunt în număr impar, primul ia rândul întreg (ca pe site), ca emailul și
  // telefonul să stea împreună și grila să nu rămână cu un gol
  const halves = (form?.fields ?? []).filter(x => !['textarea', 'checkbox'].includes(x.type));
  const fullFirst = halves.length % 2 === 1 ? halves[0]?.name : null;

  const field = x => {
    const id = `c5-${x.name}`, err = errors[x.name], pair = either && (x.name === 'email' || x.name === 'phone');
    const describedBy = [pair && 'c5-h-contact', err && `${id}-e`].filter(Boolean).join(' ') || undefined;
    const label = (
      <label htmlFor={id}>{x.label}{x.required ? <span className="k5-req" aria-hidden="true"> *</span> : !pair && <span className="k5-opt"> {t.optional}</span>}</label>
    );
    const common = {id, name: x.name, required: x.required, 'aria-invalid': err ? true : undefined, 'aria-describedby': describedBy,
      onChange: () => err && setErrors(({[x.name]: _, contact, ...rest}) => pair ? rest : {...rest, ...(contact ? {contact} : {})})};
    if (x.type === 'checkbox') {
      return (
        <div key={x.name} className="k5-field k5-wide">
          <label className="k5-check"><input type="checkbox" {...common}/><span>{consent || x.label}</span></label>
          {err && <p className="k5-err" id={`${id}-e`}>{err}</p>}
        </div>
      );
    }
    let control;
    if (x.type === 'select') control = (
      <select {...common} defaultValue="">
        <option value="" disabled={x.required}>{x.placeholder}</option>
        {x.options.map(o => <option key={o}>{o}</option>)}
      </select>
    );
    else if (x.type === 'textarea') control = <textarea {...common} rows={4} placeholder={x.placeholder || undefined}/>;
    else control = <input {...common} type={x.type} autoComplete={{name: 'name', email: 'email', phone: 'tel'}[x.name]} inputMode={x.type === 'tel' ? 'tel' : undefined}/>;
    return (
      <div key={x.name} className={`k5-field${x.type === 'textarea' || x.name === fullFirst ? ' k5-wide' : ''}`}>
        {label}{control}
        {err && <p className="k5-err" id={`${id}-e`}>{err}</p>}
      </div>
    );
  };

  const fields = (form?.fields ?? []).flatMap(x => {
    const el = field(x);
    // După perechea telefon/email: indicația „unul dintre ele” și eroarea ei
    if (!either || x.name !== form.fields.filter(y => y.name === 'email' || y.name === 'phone').at(-1).name) return [el];
    return [el, (
      <div key="c5-pair" className="k5-wide k5-pair">
        <p className="k5-hint" id="c5-h-contact">{t.contactHint}</p>
        {errors.contact && <p className="k5-err">{errors.contact}</p>}
      </div>
    )];
  });

  const channels = f && (
    <ul className="k5-channels">
      <li><Icon id="phone" size={18}/><span><small>{L.telefon ?? t.phone}</small><a href={`tel:${f.phone}`}>{f.phoneLabel}</a></span></li>
      <li><Icon id="mail" size={18}/><span><small>Email</small><a href={`mailto:${f.email}`}>{f.email}</a></span></li>
      <li><Icon id="whatsapp" size={18}/><span><small>WhatsApp</small><a href={f.whatsapp}>{L['scrie-ne-whatsapp'] ?? 'WhatsApp'}</a></span></li>
      <li><Icon id="pin" size={18}/><span><small>{L.adresa ?? t.address}</small>{f.address}{f.schedule && <em>{f.schedule}</em>}</span></li>
    </ul>
  );

  return (
    <section className="k5" id={data.anchor} aria-labelledby="k5-title">
      <div className="h5-wrap k5-grid">
        <div className="k5-copy" data-rv>
          <p className="v5-eyebrow">{data.eyebrow}</p>
          <h2 className="k5-title" id="k5-title">{data.heading}</h2>
          {data.lead && <p className="k5-lead">{data.lead}</p>}
          {channels}
        </div>

        {form && (
          <form ref={formRef} className="k5-form" data-rv noValidate onSubmit={onSubmit} aria-labelledby="k5-form-title">
            <div className="k5-form-head">
              <h3 className="k5-form-title" id="k5-form-title">{form.title}</h3>
              {form.intro && <p>{form.intro}</p>}
              <p className="k5-required"><span aria-hidden="true">* </span>{t.requiredNote}</p>
            </div>
            <div className="k5-fields">{fields}</div>
            <div className="k5-foot">
              <button className="v5-btn" type="submit">{form.submit} <Icon id="arrow" size={16}/></button>
              <div className="k5-status" role="status" aria-live="polite">
                {status === 'invalid' && <p className="k5-err">{t.errInvalid}</p>}
                {status === 'not-sent' && (
                  <div className="k5-notsent">
                    <p>{data.notSent}</p>
                    {f && (
                      <p className="k5-direct">
                        <a href={`tel:${f.phone}`}><Icon id="phone" size={16}/>{f.phoneLabel}</a>
                        <a href={f.whatsapp}><Icon id="whatsapp" size={16}/>{L['scrie-ne-whatsapp'] ?? 'WhatsApp'}</a>
                        <a href={`mailto:${f.email}`}><Icon id="mail" size={16}/>{f.email}</a>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
