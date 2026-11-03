import type { MetadataRoute } from "next";

/** Base para o PWA. Funcionamento offline fica para uma versão futura. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Meu Armário",
    short_name: "Armário",
    description: "Estoque de casa, lista de compras e comparação de preços.",
    lang: "pt-BR",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#059669",
    icons: [{ src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
