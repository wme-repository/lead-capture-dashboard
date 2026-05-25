"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export async function createUserAction(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });

  // Server-side role enforcement — not just UI
  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const email = formData.get("email") as string;
  const name = formData.get("name") as string;
  const role = (formData.get("role") as "admin" | "user") ?? "user";

  if (!email || !name) {
    throw new Error("Email e nome são obrigatórios.");
  }

  await auth.api.createUser({
    body: {
      email,
      name,
      password: "TempPassword123!", // User must reset — no self-service password reset in Phase 1
      role,
    },
    headers: await headers(),
  });

  revalidatePath("/admin");
}

export async function banUserAction(userId: string) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  // Prevent admin from banning themselves
  if (userId === session.user.id) {
    throw new Error("Você não pode desativar sua própria conta.");
  }

  await auth.api.banUser({
    body: {
      userId,
      banReason: "Desativado pelo administrador",
    },
    headers: await headers(),
  });

  revalidatePath("/admin");
}
