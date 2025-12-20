import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h2 className="text-2xl font-semibold">Recipe Not Found</h2>
      <p className="text-muted-foreground">
        The recipe you're looking for doesn't exist.
      </p>
      <Link
        href="/"
        className="px-4 py-2 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity"
      >
        Go to Home
      </Link>
    </div>
  );
}
