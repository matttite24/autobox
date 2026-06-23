import { getAuthUserId } from "@convex-dev/auth/server";
import { QueryCtx, MutationCtx, internalQuery } from "./_generated/server";
import { DataModel, Id, TableNames } from "./_generated/dataModel";
import { v } from "convex/values";

/**
 * Valida que el usuario actual tenga acceso a una organización específica.
 * Lanza un error si no está autenticado o no pertenece a la organización.
 */
export async function requireOrgAccess(
  ctx: QueryCtx | MutationCtx,
  orgId: Id<"organizations">
) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("No autenticado");
  }

  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_user_org", (q) => q.eq("userId", userId).eq("orgId", orgId))
    .first();

  if (!membership) {
    throw new Error("Acceso denegado: No perteneces a este taller");
  }

  return { userId, membership };
}

/**
 * Valida que el usuario actual tenga acceso a un documento específico.
 * Lanza un error si el documento no existe o pertenece a una organización a la que el usuario no tiene acceso.
 * Devuelve el documento y los datos de acceso.
 */
export async function requireDocAccess<TableName extends TableNames>(
  ctx: QueryCtx | MutationCtx,
  tableName: TableName,
  id: Id<TableName>
) {
  const doc = await ctx.db.get(id);
  if (!doc) {
    throw new Error(`Documento no encontrado en la tabla ${tableName}`);
  }

  // Comprobar que el documento tiene un orgId
  const orgId = (doc as any).orgId;
  if (!orgId) {
    throw new Error(`El documento de ${tableName} no tiene un orgId asociado`);
  }

  const access = await requireOrgAccess(ctx, orgId);
  return { doc, access };
}

/**
 * Internal query usable from actions to verify org membership.
 * Throws if the caller is not authenticated or not a member of the org.
 */
export const checkOrgAccess = internalQuery({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
  },
});
