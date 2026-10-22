import { describe, expect, it } from "vitest";
import { mensajeErrorAcceso, sugerirEmail } from "@/lib/dominio/acceso";

describe("sugerirEmail", () => {
  it.each([
    ["deltoroalejandro07@gmail.con", "deltoroalejandro07@gmail.com"],
    ["ana@gmial.com", "ana@gmail.com"],
    ["ana@hotmial.com", "ana@hotmail.com"],
    ["Ana@Gmail.co", "ana@gmail.com"],
  ])("%s → %s", (e, s) => expect(sugerirEmail(e)).toBe(s));
  it("no sugiere nada si el dominio es correcto o es de empresa", () => {
    expect(sugerirEmail("ana@gmail.com")).toBeNull();
    expect(sugerirEmail("ana@distribucionesperez.es")).toBeNull();
    expect(sugerirEmail("sin-arroba")).toBeNull();
  });
});

describe("mensajeErrorAcceso", () => {
  it("espera entre envíos", () => {
    expect(mensajeErrorAcceso({ status: 429, message: "For security purposes, you can only request this after 43 seconds." })).toBe("Espera 43 segundos antes de pedir otro email.");
  });
  it("límite por hora", () => {
    expect(mensajeErrorAcceso({ status: 429, code: "over_email_send_rate_limit", message: "email rate limit exceeded" })).toMatch(/límite de emails por hora/);
  });
  it("sin acceso", () => {
    expect(mensajeErrorAcceso({ status: 422, message: "Signups not allowed for otp" })).toMatch(/no tiene acceso/);
  });
  it("otro error", () => {
    expect(mensajeErrorAcceso({ status: 500, message: "boom" })).toMatch(/No se ha podido enviar/);
  });
});
