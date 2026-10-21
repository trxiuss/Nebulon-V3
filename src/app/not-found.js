import NotFoundClient from "@/routes/NotFound/NotFoundClient";

export const metadata = {
  title: "Nebulon Project",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Nebulon Project"
  }
};

export default function NotFound() {
  return <NotFoundClient />;
}
