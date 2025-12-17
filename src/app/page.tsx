import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Next.js Full-Stack Starter</h1>
        <p className="text-muted-foreground text-lg">
          Production-ready starter kit with Hono, Better Auth, CASL, and more
        </p>
      </div>
      <div className="flex gap-4">
        <Button asChild variant="default">
          <Link href="/login">Login</Link>
        </Button>
        <Button asChild variant="default">
          <Link href="/register">Register</Link>
        </Button>
        <Button asChild variant="default">
          <Link href="/dashboard">Dashboard</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/users">Users</Link>
        </Button>
      </div>
    </div>
  );
}
