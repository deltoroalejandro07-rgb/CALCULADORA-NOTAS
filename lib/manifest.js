(function () {
  "use strict";

  // Todas las notas se guardan internamente en un porcentaje canónico 0-100
  // ("pct"). Cada sistema de calificación solo define cómo se MUESTRA y
  // cómo se INTRODUCE ese valor — así cambiar de sistema no pierde datos.
  var LETTERS = [
    { g: "A+", min: 97, val: 99 },
    { g: "A", min: 93, val: 95 },
    { g: "A-", min: 90, val: 91.5 },
    { g: "B+", min: 87, val: 88.5 },
    { g: "B", min: 83, val: 85 },
    { g: "B-", min: 80, val: 81.5 },
    { g: "C+", min: 77, val: 78.5 },
    { g: "C", min: 73, val: 75 },
    { g: "C-", min: 70, val: 71.5 },
    { g: "D+", min: 67, val: 68.5 },
    { g: "D", min: 63, val: 65 },
    { g: "D-", min: 60, val: 61.5 },
    { g: "F", min: 0, val: 45 }
  ];

  window.__APP__ = {
    brand: "NotaClara",
    storageKey: "notaclara_v1",

    systems: {
      "10": {
        id: "10",
        label: "0–10",
        sublabel: "España y Latinoamérica",
        min: 0,
        max: 10,
        step: 0.1,
        decimals: 1,
        passPct: 50,
        shortcuts: [
          { key: "aprobar", value: 5 },
          { key: "notable", value: 7 },
          { key: "sobresaliente", value: 9 },
          { key: "mh", value: 10 }
        ]
      },
      "100": {
        id: "100",
        label: "0–100",
        sublabel: "EE. UU. y otros países",
        min: 0,
        max: 100,
        step: 1,
        decimals: 0,
        passPct: 60,
        shortcuts: [
          { key: "aprobar", value: 60 },
          { key: "notable", value: 80 },
          { key: "sobresaliente", value: 90 },
          { key: "mh", value: 100 }
        ]
      },
      letter: {
        id: "letter",
        label: "A–F",
        sublabel: "Sistema de letras (EE. UU.)",
        min: 0,
        max: 100,
        step: 1,
        decimals: 0,
        passPct: 60,
        letters: LETTERS,
        shortcuts: [
          { key: "aprobar", value: 60, suffix: "(D-)" },
          { key: "notable", value: 83, suffix: "(B)" },
          { key: "sobresaliente", value: 93, suffix: "(A)" },
          { key: "mh", value: 98, suffix: "(A+)" }
        ]
      }
    },

    // Paleta tranquila: azules y verdes suaves, un par de acentos neutros.
    // El rojo se reserva exclusivamente para el estado de suspenso.
    colors: [
      "#2f7d6b", "#3b6ea5", "#4f8a8b", "#5b7fb5",
      "#7a9d54", "#a2763f", "#6b6ba0", "#3d8f8f"
    ]
    // FAQ / UI copy lives in lib/i18n.js (ES/EN/PT) — not duplicated here.
  };
})();
