import { createRemoteJWKSet, jwtVerify } from "jose";

const JWKS = createRemoteJWKSet(new URL(process.env.JWT_JWKS_URI!));

export async function requireRole(token: string, allowed = ["admin","designer"]) {
  const { payload } = await jwtVerify(token, JWKS, { issuer: process.env.JWT_ISSUER });
  const roles = (payload as any).roles ?? ((payload as any).role ? [(payload as any).role] : []);
  if (!Array.isArray(roles) || !roles.some((r: string) => allowed.includes(r))) {
    throw new Error("forbidden");
  }
  return payload;
}
