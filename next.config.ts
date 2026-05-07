import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
<<<<<<< HEAD
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
=======
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
>>>>>>> de0ab19abee698d2801e84c865af020ca3e2ac23
};

export default nextConfig;
