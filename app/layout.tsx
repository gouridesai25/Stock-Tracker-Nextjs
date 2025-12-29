import "./globals.css";
import { Inter } from "next/font/google";
import {
  HomeIcon,
  InformationCircleIcon,
  Cog6ToothIcon,
  PhoneIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Modern Side Menu App",
  description: "Next.js app with modern side menu",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex min-h-screen">
          {/* Side Menu */}
          <aside className="w-64 bg-gray-900 text-white p-6 flex flex-col">
            <h1 className="text-2xl font-bold mb-8">My App</h1>
            <nav className="flex flex-col gap-4">
              <Link
                href="#"
                className="flex items-center gap-2 p-2 rounded hover:bg-gray-700 transition"
              >
                <HomeIcon className="w-5 h-5" />
                Home
              </Link>
              {/* <Link
                href="#"
                className="flex items-center gap-2 p-2 rounded hover:bg-gray-700 transition"
              >
                <InformationCircleIcon className="w-5 h-5" />
                About
              </Link> */}
              {/* <Link
                href="#"
                className="flex items-center gap-2 p-2 rounded hover:bg-gray-700 transition"
              >
                <Cog6ToothIcon className="w-5 h-5" />
                Services
              </Link> */}
              {/* <Link
                href="#"
                className="flex items-center gap-2 p-2 rounded hover:bg-gray-700 transition"
              >
                <PhoneIcon className="w-5 h-5" />
                Contact
              </Link> */}
              {/* New Upload Page Link */}
              <Link
                href="/upload"
                className="flex items-center gap-2 p-2 rounded hover:bg-gray-700 transition"
              >
                <ArrowUpTrayIcon className="w-5 h-5" />
                Upload Document
              </Link>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 bg-gray-100 p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
