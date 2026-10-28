// Textele machetei de probă /varianta/ (DESIGN.md §8.3, §10): se suprapun peste datele din Brain doar la randarea
// variantei; Brain-ul și site-ul rămân neatinse. Dacă varianta se aplică pe site, textele se mută în Brain.
export const VARIANT_TEXT = {
  v2: {
    ro: {
      // Hero-ul homepage-ului: eticheta despre loc (nu „ultimele apartamente” fără dovadă), titlul concret, fără superlativ
      sectiuni: {1: {eyebrow: 'Pe malul lacului · Nordul Bucureștiului', heading: 'Diminețile încep pe malul lacului'}},
      // „nr. 1 pe piață” nu are sursă citată: rămâne afirmația verificabilă
      avantaje: {11: {title: 'Izolație fonică și etanșare'}}
    }
  }
};

export const variantText = (variant, lang) => (variant && VARIANT_TEXT[variant]?.[lang]) || null;
