import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components (padrão do create-next-app 16) foi desativado de
  // propósito: todas as telas dependem do usuário logado e o modo dinâmico
  // tradicional é mais simples de manter nesta primeira versão.
  // Ver docs/ARQUITETURA.md.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Foto do produto: até 2 MB + dados do formulário
      bodySizeLimit: "3mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
