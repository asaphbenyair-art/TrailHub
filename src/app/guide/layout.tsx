import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function GuideLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) redirect("/auth/login");

  const role = (session.user as { role?: string }).role;
  if (role !== "GUIDE" && role !== "ADMIN") redirect("/");

  return <>{children}</>;
}
