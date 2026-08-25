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
          { key: "aprobar", label: "Aprobar", value: 5 },
          { key: "notable", label: "Notable", value: 7 },
          { key: "sobresaliente", label: "Sobresaliente", value: 9 },
          { key: "mh", label: "Matrícula de Honor", value: 10 }
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
          { key: "aprobar", label: "Aprobar", value: 60 },
          { key: "notable", label: "Notable", value: 80 },
          { key: "sobresaliente", label: "Sobresaliente", value: 90 },
          { key: "mh", label: "Matrícula de Honor", value: 100 }
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
          { key: "aprobar", label: "Aprobar (D-)", value: 60 },
          { key: "notable", label: "Notable (B)", value: 83 },
          { key: "sobresaliente", label: "Sobresaliente (A)", value: 93 },
          { key: "mh", label: "Matrícula (A+)", value: 98 }
        ]
      }
    },

    // Paleta tranquila: azules y verdes suaves, un par de acentos neutros.
    // El rojo se reserva exclusivamente para el estado de suspenso.
    colors: [
      "#2f7d6b", "#3b6ea5", "#4f8a8b", "#5b7fb5",
      "#7a9d54", "#a2763f", "#6b6ba0", "#3d8f8f"
    ],

    faqs: [
      {
        q: "¿Qué es la nota media ponderada y cómo se calcula?",
        a: "Es la media de varias notas donde cada una cuenta más o menos según su peso (porcentaje) sobre la nota final. Se multiplica cada nota por su peso, se suman esos resultados y se divide entre 100. Por ejemplo, un examen que vale 60% con un 7 aporta 4,2 puntos a la nota final."
      },
      {
        q: "¿Qué nota necesito para aprobar el examen final?",
        a: "Activa el «modo objetivo» en tu asignatura, marca ese examen como pendiente, elige «Aprobar» como objetivo (o escribe la nota exacta que quieres) y la calculadora te mostrará al instante la nota mínima que necesitas sacar en esa prueba para conseguirlo."
      },
      {
        q: "¿Esta calculadora funciona para cualquier país o sistema educativo?",
        a: "Sí. Puedes elegir entre la escala 0-10 con un decimal (habitual en España y Latinoamérica), la escala 0-100 (habitual en Estados Unidos y otros países) o el sistema de letras A-F, que se convierte automáticamente a un valor numérico equivalente. Cambiar de sistema no borra tus notas."
      },
      {
        q: "¿Qué pasa si mis pesos no suman 100%?",
        a: "La calculadora te avisa de forma discreta de cuánto falta o sobra, pero sigue calculando la nota aproximada con los datos que ya tienes mientras terminas de ajustar los porcentajes. No es necesario que sumen exactamente 100% para ver un resultado orientativo."
      },
      {
        q: "¿Qué significa que el objetivo sea «matemáticamente imposible»?",
        a: "Significa que, aunque sacaras la nota máxima en todo lo que te queda pendiente, no podrías alcanzar la nota final que has marcado como objetivo, porque el peso restante ya no es suficiente. La calculadora te muestra la nota máxima real a la que puedes aspirar."
      },
      {
        q: "¿Mis notas se guardan en algún servidor?",
        a: "No. Todo se guarda únicamente en tu navegador (localStorage), en tu propio dispositivo. Nadie más puede ver tus asignaturas ni tus notas, no hace falta registrarse y no se envía ningún dato a ningún servidor. Si borras los datos del navegador o cambias de dispositivo, tendrás que volver a introducirlas."
      },
      {
        q: "¿Puedo llevar varias asignaturas a la vez?",
        a: "Sí, puedes crear tantas asignaturas como quieras, cada una como una tarjeta independiente con su propio nombre, color y lista de notas. Arriba de todo verás un resumen con la media conjunta de todas tus asignaturas."
      },
      {
        q: "¿Qué es una nota de corte y cómo la uso aquí?",
        a: "La nota de corte es la puntuación mínima que exige un centro, beca o proceso de admisión. Puedes usar el modo objetivo escribiendo esa nota de corte como meta personalizada para saber qué necesitas sacar en lo que te falta para alcanzarla."
      },
      {
        q: "Is this a grade calculator or a final grade calculator?",
        a: "Es ambas cosas: funciona como calculadora de nota media (weighted grade calculator) para tu media ponderada actual, y como calculadora de «qué nota necesito para aprobar» (what grade do I need calculator) para calcular la nota final objetivo."
      },
      {
        q: "¿Puedo exportar o compartir mis notas?",
        a: "Sí, el botón «Exportar mis notas» genera una imagen o un PDF con el resumen de tus asignaturas y tu media, lista para guardar o compartir con quien quieras."
      },
      {
        q: "¿Los cálculos son exactos o solo orientativos?",
        a: "Los cálculos matemáticos (media ponderada, nota mínima necesaria) son exactos según los datos que introduces. Aun así, cada centro educativo puede tener sus propias normas de redondeo o evaluación, así que usa el resultado como una guía fiable, no como el acta oficial de notas."
      }
    ]
  };
})();
