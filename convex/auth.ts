import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, args) {
      if (args.existingUserId) return; // Only run on creation
      
      const user = await ctx.db.get(args.userId);
      const userName = user?.name || user?.email?.split('@')[0] || "Usuario";
      
      const orgId = await ctx.db.insert("organizations", { 
        name: `Taller de ${userName}` 
      });
      
      await ctx.db.insert("memberships", { 
        userId: args.userId, 
        orgId, 
        role: "owner" 
      });
    },
  },
});
