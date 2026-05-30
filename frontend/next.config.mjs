const imageKitEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;

const imageKitRemotePattern = imageKitEndpoint
  ? (() => {
      const endpoint = new URL(imageKitEndpoint);
      const pathname = endpoint.pathname.replace(/\/$/, "");

      return {
        protocol: endpoint.protocol.replace(":", ""),
        hostname: endpoint.hostname,
        pathname: `${pathname || ""}/**`,
      };
    })()
  : {
      protocol: "https",
      hostname: "ik.imagekit.io",
    };

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5001',
      },
      imageKitRemotePattern,
    ],
  },
};

export default nextConfig;
