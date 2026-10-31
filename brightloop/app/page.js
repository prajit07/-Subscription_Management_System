"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace("/login");
    } else if (session.user.role === "customer") {
      router.replace("/portal");
    } else {
      router.replace("/dashboard");
    }
  }, [session, status, router]);

  return (
    <div className="loading-spinner">
      <div className="spinner"></div>
    </div>
  );
}
