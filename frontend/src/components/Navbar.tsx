'use client';

import Link from "next/link";

const Navbar = () => {
    return (
      <nav className="w-full bg-white text-black py-4 shadow-md border-b">
        <div className="max-w-6xl mx-auto flex justify-between items-center px-6">
          <Link href="/" className="text-2xl font-bold tracking-wide">
            Spotify Analytics
          </Link>
          <div className="flex space-x-8">
            <Link href="/" className="hover:text-gray-500 transition font-medium">Home</Link>
            <Link href="/top25" className="hover:text-gray-500 transition font-medium">Top 25 Songs</Link>
            <Link href="/visualizer" className="hover:text-gray-500 transition font-medium">Visualizer</Link>
            <Link href="/saved-tracks" className="hover:text-gray-500 transition font-medium">Mosaic</Link>
          </div>
        </div>
      </nav>
    );
  };

export default Navbar;
